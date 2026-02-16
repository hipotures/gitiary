import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

type Theme = 'dark' | 'light';
type ThemeMode = Theme | 'both';

type RangePreset = {
	key: '7d' | '30d' | '90d' | '180d' | '360d' | 'all';
	storageValue: string;
};

type CliOptions = {
	themeMode: ThemeMode;
	outDir: string;
	baseUrl?: string;
	viewport: { width: number; height: number };
	timeoutMs: number;
	sectionPadding: number;
};

type ManifestEntry = {
	theme: Theme;
	range: RangePreset['key'];
	route: string;
	sectionId: string;
	title: string;
	filePath: string;
};

const DEFAULT_PORT = 4173;
const DEFAULT_THEME_MODE: ThemeMode = 'dark';
const DEFAULT_OUT_DIR = 'shots';
const DEFAULT_VIEWPORT = { width: 1600, height: 1200 };
const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_SECTION_PADDING = 16;

const RANGE_PRESETS: RangePreset[] = [
	{ key: '7d', storageValue: '7' },
	{ key: '30d', storageValue: '30' },
	{ key: '90d', storageValue: '90' },
	{ key: '180d', storageValue: '180' },
	{ key: '360d', storageValue: '360' },
	{ key: 'all', storageValue: 'all' }
];

const STATIC_ROUTES = ['/', '/compare', '/story', '/heat', '/impact'];

function parseArgs(argv: string[]): CliOptions {
	const options: CliOptions = {
		themeMode: DEFAULT_THEME_MODE,
		outDir: DEFAULT_OUT_DIR,
		viewport: DEFAULT_VIEWPORT,
		timeoutMs: DEFAULT_TIMEOUT_MS,
		sectionPadding: DEFAULT_SECTION_PADDING
	};

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];

		if (arg === '--theme') {
			const value = argv[i + 1];
			if (!value || !['dark', 'light', 'both'].includes(value)) {
				throw new Error('Invalid --theme value. Use dark, light, or both.');
			}
			options.themeMode = value as ThemeMode;
			i += 1;
			continue;
		}

		if (arg === '--out-dir') {
			const value = argv[i + 1];
			if (!value) throw new Error('Missing value for --out-dir');
			options.outDir = value;
			i += 1;
			continue;
		}

		if (arg === '--base-url') {
			const value = argv[i + 1];
			if (!value) throw new Error('Missing value for --base-url');
			options.baseUrl = value.replace(/\/$/, '');
			i += 1;
			continue;
		}

		if (arg === '--viewport') {
			const value = argv[i + 1];
			if (!value) throw new Error('Missing value for --viewport');
			const viewport = parseViewport(value);
			options.viewport = viewport;
			i += 1;
			continue;
		}

		if (arg === '--timeout-ms') {
			const value = argv[i + 1];
			const timeoutMs = Number(value);
			if (!value || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
				throw new Error('Invalid --timeout-ms value. Use a positive integer.');
			}
			options.timeoutMs = timeoutMs;
			i += 1;
			continue;
		}

		if (arg === '--section-padding') {
			const value = argv[i + 1];
			const sectionPadding = Number(value);
			if (!value || !Number.isFinite(sectionPadding) || sectionPadding < 0) {
				throw new Error('Invalid --section-padding value. Use a non-negative integer.');
			}
			options.sectionPadding = Math.round(sectionPadding);
			i += 1;
			continue;
		}

		if (arg === '--help' || arg === '-h') {
			printUsage();
			process.exit(0);
		}

		throw new Error(`Unknown argument: ${arg}`);
	}

	return options;
}

function printUsage(): void {
	console.log(`Usage: npx tsx scripts/capture-sections.ts [options]

Options:
  --theme <dark|light|both>   Theme mode (default: dark)
  --out-dir <path>            Output directory (default: shots)
  --base-url <url>            Use an already running app instead of auto-start
  --viewport <width>x<height> Viewport size (default: 1600x1200)
  --timeout-ms <number>       Timeout for page operations (default: 20000)
  --section-padding <number>  Outer padding around each section screenshot (default: 16)
  --help                      Show this help
`);
}

function parseViewport(value: string): { width: number; height: number } {
	const match = value.match(/^(\d+)x(\d+)$/);
	if (!match) {
		throw new Error('Invalid --viewport value. Use format WIDTHxHEIGHT, e.g. 1600x1200');
	}

	const width = Number(match[1]);
	const height = Number(match[2]);
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
		throw new Error('Invalid viewport dimensions.');
	}

	return { width, height };
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	const healthUrl = `${url}/api/repos`;

	while (Date.now() < deadline) {
		try {
			const response = await fetch(healthUrl);
			if (response.ok) return;
		} catch {
			// Keep waiting until timeout.
		}

		await sleep(300);
	}

	throw new Error(`Server did not become ready within ${timeoutMs}ms: ${healthUrl}`);
}

function startDevServer(port: number): ChildProcessWithoutNullStreams {
	const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
		stdio: ['ignore', 'pipe', 'pipe'],
		env: process.env
	});

	child.stdout.on('data', (chunk: Buffer) => {
		process.stdout.write(`[dev] ${String(chunk)}`);
	});

	child.stderr.on('data', (chunk: Buffer) => {
		process.stderr.write(`[dev] ${String(chunk)}`);
	});

	child.on('exit', (code, signal) => {
		if (code !== 0 && signal !== 'SIGTERM') {
			console.error(`[dev] exited with code ${code ?? 'null'} signal ${signal ?? 'null'}`);
		}
	});

	return child;
}

function toRouteKey(route: string): string {
	if (route === '/') return 'home';
	return route.replace(/^\//, '').replace(/\//g, '_');
}

function sanitizeSegment(raw: string, fallback: string): string {
	const sanitized = raw
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return sanitized || fallback;
}

function captureUrl(baseUrl: string, route: string): string {
	const separator = route.includes('?') ? '&' : '?';
	return `${baseUrl}${route}${separator}capture=1`;
}

async function fetchRepoIds(baseUrl: string): Promise<number[]> {
	const response = await fetch(`${baseUrl}/api/repos`);
	if (!response.ok) {
		throw new Error(`Failed to load repos from /api/repos (${response.status})`);
	}

	const payload = (await response.json()) as Array<{ id: number }>;
	return payload
		.map((item) => item.id)
		.filter((value) => Number.isFinite(value))
		.sort((a, b) => a - b);
}

async function getHeatYears(page: any): Promise<number[]> {
	const raw = await page.locator('.year-selector .year-btn').allTextContents();
	return raw
		.map((text: string) => Number(text.trim()))
		.filter((value: number) => Number.isInteger(value))
		.sort((a: number, b: number) => a - b);
}

async function waitForCharts(page: any, timeoutMs: number): Promise<void> {
	await page.waitForFunction(
		() => {
			const chartElements = Array.from(document.querySelectorAll('.chart'));
			if (chartElements.length === 0) return true;

			return chartElements.every((el) => {
				if (el.querySelector('canvas,svg')) return true;
				const text = (el.textContent ?? '').trim().toLowerCase();
				return text.includes('no data');
			});
		},
		{},
		{ timeout: Math.min(timeoutMs, 10000) }
	);
}

async function screenshotSectionWithPadding(
	page: any,
	section: any,
	filePath: string,
	padding: number
): Promise<void> {
	await section.scrollIntoViewIfNeeded();
	await page.waitForTimeout(120);

	const box = await section.boundingBox();
	if (!box) {
		throw new Error(`Cannot compute bounding box for section: ${filePath}`);
	}

	const pageMetrics = await page.evaluate(() => ({
		scrollX: window.scrollX,
		scrollY: window.scrollY,
		pageWidth: Math.max(
			document.documentElement.scrollWidth,
			document.body.scrollWidth,
			document.documentElement.clientWidth
		),
		pageHeight: Math.max(
			document.documentElement.scrollHeight,
			document.body.scrollHeight,
			document.documentElement.clientHeight
		)
	}));

	const absoluteX = box.x + pageMetrics.scrollX;
	const absoluteY = box.y + pageMetrics.scrollY;

	const clipX = Math.max(0, Math.floor(absoluteX - padding));
	const clipY = Math.max(0, Math.floor(absoluteY - padding));
	const clipWidth = Math.max(
		1,
		Math.min(
			pageMetrics.pageWidth - clipX,
			Math.ceil(box.width + padding * 2)
		)
	);
	const clipHeight = Math.max(
		1,
		Math.min(
			pageMetrics.pageHeight - clipY,
			Math.ceil(box.height + padding * 2)
		)
	);

	const clippedTooMuch =
		clipWidth < Math.max(200, Math.floor(box.width * 0.8)) ||
		clipHeight < Math.max(140, Math.floor(box.height * 0.8));

	if (clippedTooMuch) {
		// Safety fallback: capture raw element bounds from a full-page screenshot.
		const rawX = Math.max(0, Math.floor(absoluteX));
		const rawY = Math.max(0, Math.floor(absoluteY));
		const rawW = Math.max(1, Math.ceil(box.width));
		const rawH = Math.max(1, Math.ceil(box.height));
		await page.screenshot({
			path: filePath,
			fullPage: true,
			clip: {
				x: rawX,
				y: rawY,
				width: rawW,
				height: rawH
			}
		});
		return;
	}

	await page.screenshot({
		path: filePath,
		fullPage: true,
		clip: {
			x: clipX,
			y: clipY,
			width: clipWidth,
			height: clipHeight
		}
	});
}

async function main(): Promise<void> {
	const options = parseArgs(process.argv.slice(2));
	const outputRoot = resolve(options.outDir);
	const shouldStartDevServer = !options.baseUrl;
	const baseUrl = options.baseUrl ?? `http://127.0.0.1:${DEFAULT_PORT}`;
	const manifestEntries: ManifestEntry[] = [];

	let devServer: ChildProcessWithoutNullStreams | null = null;

	const cleanup = () => {
		if (devServer && !devServer.killed) {
			devServer.kill('SIGTERM');
		}
	};

	process.on('SIGINT', () => {
		cleanup();
		process.exit(130);
	});

	process.on('SIGTERM', () => {
		cleanup();
		process.exit(143);
	});

	if (shouldStartDevServer) {
		console.log(`Starting dev server at ${baseUrl}...`);
		devServer = startDevServer(DEFAULT_PORT);
		await waitForServer(baseUrl, options.timeoutMs);
		console.log('Dev server is ready.');
	}

	rmSync(outputRoot, { recursive: true, force: true });
	mkdirSync(outputRoot, { recursive: true });

	let chromium: any;
	try {
		const playwright = await import('playwright');
		chromium = playwright.chromium;
	} catch {
		throw new Error(
			'Playwright module not found. Install it with: npm install -D playwright && npx playwright install chromium'
		);
	}

	const repoIds = await fetchRepoIds(baseUrl);
	const repoRoutes = repoIds.map((id) => `/repo/${id}`);
	const routes = [...STATIC_ROUTES, ...repoRoutes];

	console.log(`Found ${repoIds.length} repositories and ${routes.length} routes.`);

	const themes: Theme[] =
		options.themeMode === 'both' ? ['dark', 'light'] : [options.themeMode];
	const browser = await chromium.launch({ headless: true });

	try {
		for (const theme of themes) {
			for (const range of RANGE_PRESETS) {
				console.log(`Capturing theme=${theme} range=${range.key}...`);

				const context = await browser.newContext({
					viewport: options.viewport,
					colorScheme: theme
				});

				await context.addInitScript(
					(params: { range: string; theme: Theme }) => {
						localStorage.setItem('git-diary-date-range', params.range);
						localStorage.setItem('git-diary-theme', params.theme);
						document.documentElement.setAttribute('data-theme', params.theme);
					},
					{ range: range.storageValue, theme }
				);

				const page = await context.newPage();

				for (const route of routes) {
					const routeVariants: string[] = [];
					if (route === '/heat') {
						const discoverUrl = captureUrl(baseUrl, '/heat');
						await page.goto(discoverUrl, { waitUntil: 'networkidle', timeout: options.timeoutMs });
						const discoveredYears = await getHeatYears(page);
						if (discoveredYears.length > 0) {
							for (const year of discoveredYears) {
								routeVariants.push(`/heat?year=${year}`);
							}
						} else {
							routeVariants.push('/heat');
						}
					} else {
						routeVariants.push(route);
					}

					for (const routeVariant of routeVariants) {
						const url = captureUrl(baseUrl, routeVariant);
						console.log(`  ${url}`);

						await page.goto(url, { waitUntil: 'networkidle', timeout: options.timeoutMs });
						await page.waitForSelector('[data-shot-section]', { timeout: options.timeoutMs });
						await waitForCharts(page, options.timeoutMs);
						await page.waitForTimeout(180);

						const sections = page.locator('[data-shot-section]');
						const sectionCount = await sections.count();
						const seenSectionIds = new Set<string>();

						for (let i = 0; i < sectionCount; i += 1) {
							const section = sections.nth(i);
							const rawId = (await section.getAttribute('data-shot-section')) ?? '';
							const rawTitle = (await section.getAttribute('data-shot-title')) ?? '';
							const fallbackId = `section-${i + 1}`;
							const baseSectionId = sanitizeSegment(rawId, fallbackId);
							let sectionId = baseSectionId;
							let suffix = 2;

							while (seenSectionIds.has(sectionId)) {
								sectionId = `${baseSectionId}-${suffix}`;
								suffix += 1;
							}

							seenSectionIds.add(sectionId);

							const routeKey = sanitizeSegment(toRouteKey(routeVariant), 'route');
							const themeRoot =
								options.themeMode === 'both' ? resolve(outputRoot, theme) : outputRoot;
							const sectionDir = resolve(themeRoot, range.key, routeKey);
							const filePath = resolve(sectionDir, `${sectionId}.png`);

							mkdirSync(dirname(filePath), { recursive: true });
							await screenshotSectionWithPadding(
								page,
								section,
								filePath,
								options.sectionPadding
							);

							manifestEntries.push({
								theme,
								range: range.key,
								route: routeVariant,
								sectionId,
								title: rawTitle || sectionId,
								filePath
							});
						}
					}
				}

				await context.close();
			}
		}
	} finally {
		await browser.close();
		cleanup();
	}

	const manifest = {
		generatedAt: new Date().toISOString(),
		baseUrl,
		options: {
			themeMode: options.themeMode,
			viewport: options.viewport,
			timeoutMs: options.timeoutMs,
			sectionPadding: options.sectionPadding
		},
		count: manifestEntries.length,
		entries: manifestEntries
	};

	const manifestPath = resolve(outputRoot, 'manifest.json');
	writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
	console.log(`Saved ${manifestEntries.length} screenshots.`);
	console.log(`Manifest: ${manifestPath}`);
}

main().catch((error) => {
	console.error('capture-sections failed:', error);
	process.exit(1);
});
