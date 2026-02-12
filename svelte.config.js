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
			strict: true
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
