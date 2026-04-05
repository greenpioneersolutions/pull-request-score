import {
  makeGraphQLClient,
  graphqlWithRetry,
} from "../api/githubGraphql.js";
import { getAuthStrategy } from "../auth/getAuthStrategy.js";

export interface OrgReposParams {
  org: string;
  auth: string;
  baseUrl?: string;
}

interface OrgReposQuery {
  organization: {
    repositories: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: { nameWithOwner: string }[];
    };
  };
}

const query = `query($org:String!,$cursor:String){
  organization(login:$org){
    repositories(first:100,after:$cursor,orderBy:{field:UPDATED_AT,direction:DESC}){
      pageInfo{hasNextPage,endCursor}
      nodes{nameWithOwner}
    }
  }
}`;

/**
 * Fetch all repository names for a GitHub organization.
 */
export async function fetchOrgRepos(
  params: OrgReposParams,
): Promise<string[]> {
  const authStrategy = getAuthStrategy({
    owner: params.org,
    token: params.auth,
    baseUrl: params.baseUrl,
  });
  const client = makeGraphQLClient({
    authStrategy,
    baseUrl: params.baseUrl,
  });

  const repos: string[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data: OrgReposQuery = await graphqlWithRetry<OrgReposQuery>(
      client,
      query,
      { org: params.org, cursor },
    );
    const connection = data.organization.repositories;
    for (const node of connection.nodes) {
      repos.push(node.nameWithOwner);
    }
    hasNextPage = connection.pageInfo.hasNextPage;
    cursor = connection.pageInfo.endCursor;
  }

  return repos;
}
