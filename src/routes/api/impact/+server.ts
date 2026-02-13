import { json } from '@sveltejs/kit';
import { getImpactData } from '$lib/server/db/queries.js';
import { buildImpactView, type ImpactRange } from '$lib/domain/impact.js';
import type { RequestHandler } from './$types.js';

function parseRange(raw: string | null): ImpactRange {
	if (!raw || raw === 'all') return 'all';
	const parsed = Number.parseInt(raw, 10);
	if ([7, 30, 90, 180, 360].includes(parsed)) {
		return parsed as ImpactRange;
	}
	return 90;
}

export const GET: RequestHandler = ({ url }) => {
	const range = parseRange(url.searchParams.get('range'));
	const data = getImpactData();
	const view = buildImpactView(data, range);
	return json(view);
};

export const prerender = false;
