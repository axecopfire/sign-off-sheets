// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { RestEndpointMethodTypes } from "@octokit/rest";
import octokit from "common/octokitClient";

import { ProjectV2 } from "@octokit/graphql-schema";
import { graphql } from "@octokit/graphql";

const owner = "vets-who-code";
const org = "vets-who-code";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!req.method || req.method !== "POST" || !req.body)
    return res.status(400).send("Bad request");

  const body = JSON.parse(req.body);

  const { studentName, mentorName, learningPath } = body;

  // It sends an invite, so for testing I don't want to keep pinging folks
  // TODO: Should create a configurable dry-run (repo create, invitations, issues etc.)
  const addIndividualAccesses = body.addIndividualAccesses || false;

  if (!studentName || !mentorName || !learningPath) {
    return res.status(502).send("Required field missing");
  }

  const projectName = learningPath + "-project";

  // Decorate parameter data, mostly use this to get node_id
  const decoratedOrg = await octokit.rest.orgs.get({
    org: owner,
  });

  const targetRepoName = learningPath + "-" + studentName;

  type GhIdsType = {
    orgId: string;
    targetRepoId?: string;
  };
  const ghIds: GhIdsType = {
    orgId: decoratedOrg.data.node_id,
  };

  // Create Repo
  const newRepo = await octokit.rest.repos.createUsingTemplate({
    template_owner: owner,
    template_repo: learningPath,
    owner,
    name: targetRepoName,
    private: true,
  });

  ghIds.targetRepoId = newRepo.data.node_id;

  // Add Repo accesses (student, admins, qualified mentors)
  // TODO: Add Qualified Mentors teams
  const teams = await octokit.rest.teams.addOrUpdateRepoPermissionsInOrg({
    org,
    team_slug: "admins",
    owner: org,
    repo: targetRepoName,
    permission: "admin",
  });
  let individualsAdded: any[] = [];

  // Adds individuals to access list.
  if (addIndividualAccesses) {
    individualsAdded = await Promise.allSettled(
      [studentName, mentorName].map(async (username) => {
        return octokit.rest.repos.addCollaborator({
          owner: org,
          repo: targetRepoName,
          username,
        });
      })
    );
  }

  // Copy Issues to new Repo
  const issuesList = await octokit.rest.issues.listForRepo({
    owner,
    repo: learningPath,
  });

  const createdIssues = await Promise.all(
    issuesList.data
      // https://octokit.github.io/rest.js/v19#issues-list-for-repo
      // The point of this filter is the PRs are listed as issues for repos as well
      .filter((issue) => !issue.pull_request)
      .map(async (issue) => {
        const issueOptions: RestEndpointMethodTypes["issues"]["create"]["parameters"] =
          {
            owner: org,
            repo: targetRepoName,
            title: issue.title,
          };
        if (issue.body) issueOptions.body = issue.body;
        if (issue.labels.length) issueOptions.labels = issue.labels;

        const createdIssue = await octokit.rest.issues.create(issueOptions);
        return createdIssue.data;
      })
  );

  // Create a projectv2
  // Note here is that octokit rest does have a create project method
  // However, that creates a classic project and we need a new one
  const gqlWithAuth = graphql.defaults({
    headers: {
      authorization: "token " + process.env.PERSONAL_GITHUB_TOKEN,
    },
  });

  type CreateProjectResponseType = {
    createProjectV2: {
      projectV2: ProjectV2;
    };
  };

  // TODO: Check for Graphql failures
  const {
    createProjectV2: { projectV2 },
  } = await gqlWithAuth<CreateProjectResponseType>(`mutation {
    createProjectV2(
          input: {
            ownerId: "${ghIds.orgId}"
            title: "${projectName}"
            repositoryId: "${ghIds.targetRepoId}"
          }
        )
        {
          projectV2 {
            id
            title
          }
        }
      }`);

  const linkedIssues = await Promise.allSettled(
    createdIssues.map((issue) => {
      return gqlWithAuth(`mutation {
        addProjectV2ItemById(
          input: {
            projectId: "${projectV2.id}"
            contentId: "${issue.node_id}"
          }
        )
        {
          item {
            id
          }
        }
      }
      `);
    })
  );

  const response = {
    projectCreated: projectV2,
    issuesCreated: createdIssues.map(({ node_id, title }) => ({
      id: node_id,
      title,
    })),
    repoCreated: {
      id: ghIds.targetRepoId,
      title: newRepo.data.name,
    },
    individualsAdded,
  };
  res.json(response);
}
