import { execSync } from 'child_process';

export interface CommitNode {
	committedDate: string; // ISO 8601 UTC
	oid: string;
	messageHeadline: string;
	additions: number;
	deletions: number;
	changedFilesIfAvailable: number | null;
}

interface GraphQLResponse {
	data: {
		repository: {
			defaultBranchRef: {
				target: {
					history: {
						pageInfo: { hasNextPage: boolean; endCursor: string | null };
						nodes: CommitNode[];
					};
				};
			} | null;
		} | null;
	};
}

function buildCommitQuery(authorEmails?: string[]): string {
	const authorFilter =
		authorEmails && authorEmails.length > 0
			? `, author: {emails: [${authorEmails.map((e) => `"${e}"`).join(', ')}]}`
			: '';
	return `query($owner: String!, $name: String!, $since: GitTimestamp, $cursor: String) {
  repository(owner: $owner, name: $name) {
    defaultBranchRef {
      target {
        ... on Commit {
          history(since: $since, first: 100, after: $cursor${authorFilter}) {
            pageInfo { hasNextPage endCursor }
            nodes { committedDate oid messageHeadline additions deletions changedFilesIfAvailable }
          }
        }
      }
    }
  }
}`;
}

export async function fetchCommits(
	owner: string,
	name: string,
	since?: string | null,
	authorEmails?: string[]
): Promise<CommitNode[]> {
	const allNodes: CommitNode[] = [];
	let cursor: string | null = null;
	let hasNextPage = true;
	const query = buildCommitQuery(authorEmails);

	while (hasNextPage) {
		try {
			const cursorFlag = cursor ? `-F cursor="${cursor}"` : '';
			const sinceFlag = since ? `-F since="${since}"` : '';
			const cmd = `gh api graphql -F query='${query}' -F owner="${owner}" -F name="${name}" ${sinceFlag} ${cursorFlag}`;

			const output = execSync(cmd, {
				encoding: 'utf-8',
				maxBuffer: 10 * 1024 * 1024,
				stdio: ['pipe', 'pipe', 'pipe']
			});

			const response: GraphQLResponse = JSON.parse(output);

			if (!response.data?.repository?.defaultBranchRef?.target?.history) {
				console.warn(`No commit history found for ${owner}/${name}`);
				break;
			}

			const history = response.data.repository.defaultBranchRef.target.history;
			allNodes.push(...history.nodes);
			hasNextPage = history.pageInfo.hasNextPage;
			cursor = history.pageInfo.endCursor;
		} catch (error) {
			if (error instanceof Error) {
				const execError = error as any;
				if (execError.stderr) {
					console.error(`GitHub API error for ${owner}/${name}:`, execError.stderr);
				}
			}
			throw error;
		}
	}

	return allNodes;
}

export interface RepoNode {
	owner: { login: string };
	name: string;
	isPrivate: boolean;
	isFork: boolean;
	defaultBranchRef: { name: string } | null;
}

interface ReposGraphQLResponse {
	data: {
		viewer: {
			repositories: {
				pageInfo: { hasNextPage: boolean; endCursor: string | null };
				nodes: RepoNode[];
			};
		};
	};
}

const REPOS_QUERY = `query($cursor: String) {
  viewer {
    repositories(first: 100, after: $cursor, orderBy: {field: NAME, direction: ASC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        owner { login }
        name
        isPrivate
        isFork
        defaultBranchRef { name }
      }
    }
  }
}`;

export async function fetchAllUserRepos(): Promise<RepoNode[]> {
	const allRepos: RepoNode[] = [];
	let cursor: string | null = null;
	let hasNextPage = true;

	while (hasNextPage) {
		try {
			const cursorFlag = cursor ? `-F cursor="${cursor}"` : '';
			const cmd = `gh api graphql -F query='${REPOS_QUERY}' ${cursorFlag}`;

			const output = execSync(cmd, {
				encoding: 'utf-8',
				maxBuffer: 10 * 1024 * 1024,
				stdio: ['pipe', 'pipe', 'pipe']
			});

			const response: ReposGraphQLResponse = JSON.parse(output);

			if (!response.data?.viewer?.repositories) {
				throw new Error('Invalid response from GitHub API');
			}

			const repos = response.data.viewer.repositories;
			allRepos.push(...repos.nodes);
			hasNextPage = repos.pageInfo.hasNextPage;
			cursor = repos.pageInfo.endCursor;
		} catch (error) {
			if (error instanceof Error) {
				const execError = error as any;
				if (execError.stderr) {
					console.error('GitHub API error:', execError.stderr);
				}
			}
			throw error;
		}
	}

	return allRepos;
}
