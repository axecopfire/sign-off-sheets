// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { RestEndpointMethodTypes } from "@octokit/rest";
import octokit from "common/octokitClient";

import { ProjectV2 } from "@octokit/graphql-schema";
import { graphql } from "@octokit/graphql";

const templateRepo = "axecopfire";
const targetRepo = "test-template-2";
const owner = "axecopfire";
const learningPathTitle = "frontend-dev";
const projectName = learningPathTitle + "-project";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Decorate parameter data, mostly use this to get node_id
  const repo = await octokit.rest.repos.get({
    owner,
    repo: templateRepo,
  });
  const decoratedOwner = await octokit.rest.users.getByUsername({
    username: owner,
  });
  const decoratedTargetRepo = await octokit.rest.repos.get({
    owner,
    repo: targetRepo,
  });

  const ghIds = {
    ownerId: decoratedOwner.data.node_id,
    targetRepo: decoratedTargetRepo.data.node_id,
  };

  // Copy Issues to new Repo
  const issuesList = await octokit.rest.issues.listForRepo({
    owner,
    repo: templateRepo,
  });

  const createdIssues = await Promise.all(
    issuesList.data.map(async (issue) => {
      const issueOptions: RestEndpointMethodTypes["issues"]["create"]["parameters"] =
        {
          owner,
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

  const {
    createProjectV2: { projectV2 },
  } = await gqlWithAuth<CreateProjectResponseType>(`mutation {
    createProjectV2(
          input: {
            ownerId: "${ghIds.ownerId}"
            title: "${projectName}"
            repositoryId: "${ghIds.targetRepo}"
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

  const response = linkedIssues;
  res.json(response);
}
