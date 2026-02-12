import type { Theme } from '$lib/stores/theme';

export const getEChartsTheme = (theme: Theme): string | undefined => {
	return theme === 'dark' ? 'dark' : undefined; // ECharts default is light
};

export const getEChartsColors = (theme: Theme) => {
	if (theme === 'dark') {
		return {
			text: '#7d8590',
			border: '#30363d',
			split: '#21262d',
			accent: '#58a6ff',
			accentAlpha66: '#388bfd66',
			accentAlpha33: '#388bfd33',
			bg: '#0d1117',
			heatmap: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']
		};
	} else {
		return {
			text: '#59636e',
			border: '#d0d7de',
			split: '#e8ecf0',
			accent: '#0969da',
			accentAlpha66: 'rgba(9, 105, 218, 0.66)',
			accentAlpha33: 'rgba(9, 105, 218, 0.33)',
			bg: '#ffffff',
			heatmap: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']
		};
	}
};
