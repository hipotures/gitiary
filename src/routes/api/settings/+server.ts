import { json, error } from '@sveltejs/kit';
import { setMetadata } from '$lib/server/db/queries.js';
import type { RequestHandler } from './$types.js';

export const PATCH: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { authorEmails } = body;

		if ('authorEmails' in body) {
			if (!Array.isArray(authorEmails)) {
				return error(400, 'authorEmails must be an array');
			}
			const cleaned = authorEmails
				.filter((e): e is string => typeof e === 'string')
				.map((e) => e.trim())
				.filter((e) => e.length > 0);
			setMetadata('authorEmails', JSON.stringify(cleaned));
		}

		return json({ success: true });
	} catch (err) {
		console.error('Failed to update settings:', err);
		return error(500, 'Failed to update settings');
	}
};

export const prerender = false;
