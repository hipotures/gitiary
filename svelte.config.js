import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: undefined,
			precompress: false,
			// Settings and the mutating API routes are server-only (prerender = false) and, as the README's
			// "Static Export" section states, not part of the static output; strict mode would fail the build on them.
			strict: false
		})
	},
	onwarn: (warning, handler) => {
		// Ignore specific warnings
		const ignoredWarnings = [
			'state_referenced_locally',
			'a11y_label_has_associated_control',
			'a11y_click_events_have_key_events',
			'a11y_no_static_element_interactions',
			'css_unused_selector'
		];

		if (ignoredWarnings.includes(warning.code)) {
			return;
		}

		// Handle all other warnings normally
		handler(warning);
	}
};

export default config;
