import { getHeatYearData } from '$lib/server/db/queries.js';
import type { PageServerLoad } from './$types.js';

const MIN_HEAT_YEAR = 2025;

export const load: PageServerLoad = () => {
	const yearData = getHeatYearData(MIN_HEAT_YEAR);
	return {
		minYear: MIN_HEAT_YEAR,
		yearData
	};
};

export const prerender = true;
