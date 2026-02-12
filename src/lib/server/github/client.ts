import { execSync } from 'child_process';

export interface CommitNode {
	committedDate: string; // ISO 8601 UTC
	oid: string;
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

const QUERY = `query($owner: String!, $name: String!, $since: GitTimestamp, $cursor: String) {
  repository(owner: $owner, name: $name) {
    defaultBranchRef {
      target {
        ... on Commit {
          history(since: $since, first: 100, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes { committedDate oid }
          }
        }
      }
    }
  }
}`;

export async function fetchCommits(
	owner: string,
	name: string,
	since: string
): Promise<CommitNode[]> {
	const allNodes: CommitNode[] = [];
	let cursor: string | null = null;
	let hasNextPage = true;

	while (hasNextPage) {
		try {
			const cursorFlag = cursor ? `-F cursor="${cursor}"` : '';
			const cmd = `gh api graphql -F query='${QUERY}' -F owner="${owner}" -F name="${name}" -F since="${since}" ${cursorFlag}`;

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
