import { building } from '$app/environment';

const empty = new URLSearchParams();

/**
 * The page's query parameters, or none while SvelteKit prerenders. Prerendered pages are static HTML that cannot
 * depend on the query string, and SvelteKit forbids reading url.searchParams there; in the browser (and in dev SSR)
 * the real parameters apply, so ?capture=1 and ?year= keep working on the static site after hydration.
 */
export function queryParams(url: URL): URLSearchParams {
	return building ? empty : url.searchParams;
}
