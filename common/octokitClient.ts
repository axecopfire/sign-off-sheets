import { Octokit } from "@octokit/rest";

let octokit: Octokit;
const personalGithubToken = process.env.PERSONAL_GITHUB_TOKEN;

if (personalGithubToken) {
  octokit = new Octokit({
    auth: personalGithubToken,
  });
} else {
  octokit = new Octokit();
}

export default octokit;
