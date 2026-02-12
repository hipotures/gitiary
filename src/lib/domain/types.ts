export interface RepoSummary {
	id: number;
	owner: string;
	name: string;
	commits7d: number;
	commits30d: number;
	commits90d: number;
	commits180d: number;
	commits360d: number;
	commitsAll: number;
	lastSyncAt: string | null;
}

export interface DailyEntry {
	day: string;
	commits: number;
}

export interface RepoDetail {
	repo: { id: number; owner: string; name: string };
	daily: DailyEntry[];
}

export interface ComparisonRepo {
	id: number;
	owner: string;
	name: string;
	totalCommits: number;
	activeDays: number;
	regularity: number;
	maxGap: number;
	currentStreak: number;
	longestStreak: number;
}

export interface ComparisonStats {
	repos: ComparisonRepo[];
	period: '30d' | '90d';
}
