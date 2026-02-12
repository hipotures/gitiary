import { json } from '@sveltejs/kit';
import { getAllDailyData } from '$lib/server/db/queries.js';
import {
	calculateCurrentStreak,
	calculateLongestStreak,
	calculateMaxGap,
	calculateRegularity
} from '$lib/domain/stats.js';
import type { RequestHandler } from './$types.js';
import type { ComparisonStats } from '$lib/domain/types.js';

export const GET: RequestHandler = ({ url }) => {
	const periodParam = url.searchParams.get('period') || '90d';
	const period = periodParam === '30d' ? '30d' : '90d';
	const days = period === '30d' ? 30 : 90;

	const allData = getAllDailyData(days);
	const today = new Date().toISOString().slice(0, 10);

	const stats: ComparisonStats = {
		period,
		repos: allData.map((item) => {
			const totalCommits = item.daily.reduce((sum, d) => sum + d.commits, 0);
			const activeDays = item.daily.filter((d) => d.commits > 0).length;

			return {
				id: item.repo.id,
				owner: item.repo.owner,
				name: item.repo.name,
				totalCommits,
				activeDays,
				regularity: calculateRegularity(item.daily, days),
				maxGap: calculateMaxGap(item.daily),
				currentStreak: calculateCurrentStreak(item.daily, today),
				longestStreak: calculateLongestStreak(item.daily)
			};
		})
	};

	return json(stats);
};
