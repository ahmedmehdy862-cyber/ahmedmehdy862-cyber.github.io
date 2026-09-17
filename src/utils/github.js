import axios from 'axios';

const GITHUB_USERNAME = 'ahmedmehdy862-cyber';

const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    'Accept': 'application/vnd.github.v3+json',
  },
});

export const getRepositories = async () => {
  try {
    const response = await githubApi.get(`/users/${GITHUB_USERNAME}/repos`, {
      params: {
        sort: 'updated',
        direction: 'desc',
        per_page: 10,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return [];
  }
};

export const getGitHubStats = async () => {
  try {
    const response = await githubApi.get(`/users/${GITHUB_USERNAME}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching GitHub stats:', error);
    return null;
  }
};

export const getPinnedRepos = async () => {
  try {
    const query = `user:${GITHUB_USERNAME} is:public`;
    const response = await githubApi.post('/graphql', {
      query: `
        query {
          user(login: "${GITHUB_USERNAME}") {
            pinnedItems(first: 6, types: REPOSITORY) {
              nodes {
                ... on Repository {
                  name
                  description
                  url
                  primaryLanguage {
                    name
                    color
                  }
                  stargazerCount
                  forkCount
                }
              }
            }
          }
        }
      `,
    });
    return response.data?.data?.user?.pinnedItems?.nodes || [];
  } catch (error) {
    console.error('Error fetching pinned repos:', error);
    return [];
  }
};
