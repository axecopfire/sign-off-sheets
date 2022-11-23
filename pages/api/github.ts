// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { RestEndpointMethodTypes } from "@octokit/rest";
import octokit from "common/octokitClient";

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
  const issuesList = await octokit.rest.issues.listForRepo({
    owner,
    repo: templateRepo,
  });

  // Copy Issues to new Repo
  const createdIssues = await Promise.allSettled(
    issuesList.data.map(async (issue) => {
      const issueOptions: RestEndpointMethodTypes["issues"]["create"]["parameters"] =
        {
          owner,
          repo: targetRepo,
          title: issue.title,
        };
      if (issue.body) issueOptions.body = issue.body;
      if (issue.labels.length) issueOptions.labels = issue.labels;

      console.log(issueOptions);

      const createdIssue = await octokit.rest.issues.create(issueOptions);
      return createdIssue;
    })
  );

  // Create a projectv2 and link to issues
  // Note here is that octokit rest does have a create project method
  // However, that creates a classic project and we need a new one
  const gqlWithAuth = graphql.defaults({
    headers: {
      authorization: "token " + process.env.PERSONAL_GITHUB_TOKEN,
    },
  });

  const createProjectGQLQuery = `mutation {
  createProjectV2(
        input: {
          ownerId: "${decoratedOwner.data.node_id}"
          title: "${projectName}"
          repositoryId: "${decoratedTargetRepo.data.node_id}"
        }
      )
      {
        projectV2 {
          id
          title
        }
      }
    }`;

  const responseFromGql = await gqlWithAuth(createProjectGQLQuery);

  const response = createProjectGQLQuery;
  res.json(response);
}
