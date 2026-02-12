interface RepoWithNames {
	name: string;
	displayName?: string | null;
	owner?: string;
}

/**
 * Returns the display name if set, otherwise the original repo name
 */
export function getDisplayName(repo: RepoWithNames): string {
	return repo.displayName || repo.name;
}
