// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { RestEndpointMethodTypes } from "@octokit/rest";
import octokit from "common/octokitClient";

import { ProjectV2 } from "@octokit/graphql-schema";
import { graphql } from "@octokit/graphql";

const templateRepo = "axecopfire";
const targetRepo = "test-template";
const owner = "axecopfire";
const learningPathTitle = "frontend-dev";
const projectName = learningPathTitle + "-project";
const org = "vets-who-code";

const individualAccesses = ["jeromehardaway"];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Decorate parameter data, mostly use this to get node_id
  const decoratedOrg = await octokit.rest.orgs.get({
    org,
  });
  const decoratedOwner = await octokit.rest.users.getByUsername({
    username: owner,
  });

  type GhIdsType = {
    ownerId: string;
    orgId: string;
    targetRepoId?: string;
  };
  const ghIds: GhIdsType = {
    ownerId: decoratedOwner.data.node_id,
    orgId: decoratedOrg.data.node_id,
  };

  // Create Repo
  const newRepo = await octokit.rest.repos.createUsingTemplate({
    template_owner: owner,
    template_repo: templateRepo,
    owner: org,
    name: targetRepo,
    private: true,
  });

  ghIds.targetRepoId = newRepo.data.node_id;

  // Add Repo accesses (student, admins, qualified mentors)
  // TODO: Add Qualified Mentors teams
  const teams = await octokit.rest.teams.addOrUpdateRepoPermissionsInOrg({
    org,
    team_slug: "admins",
    owner: org,
    repo: targetRepo,
    permission: "admin",
  });

  // Adds individuals to access list.
  // It sends an invite, so for testing I don't want to keep pinging folks
  // const individuals = await Promise.allSettled(
  //   individualAccesses.map((username) =>
  //     octokit.rest.repos.addCollaborator({
  //       owner,
  //       repo: targetRepo,
  //       username,
  //     })
  //   )
  // );

  // Copy Issues to new Repo
  const issuesList = await octokit.rest.issues.listForRepo({
    owner,
    repo: templateRepo,
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
            repo: targetRepo,
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
  };
  res.json(response);
}
