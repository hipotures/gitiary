// Browser checks and screenshots for the shared design-system pilot (see docs/design-system.md).
//
// Gitiary does not depend on Playwright, so the tools come from another install (no package.json change):
//   DS_TOOLS_NODE_MODULES=/path/to/node_modules   must contain playwright, pngjs and pixelmatch
//   GITIARY_URL=http://127.0.0.1:5299             a running `vite dev` server with seeded data
//
//   node scripts/design-system-pilot.mjs capture <dir>          screenshots of every view (both themes, desktop + mobile)
//   node scripts/design-system-pilot.mjs compare <before> <after> pixel diff of two capture directories
//   node scripts/design-system-pilot.mjs verify                  keyboard, focus, disabled, theme and layout checks
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const toolsDir = process.env.DS_TOOLS_NODE_MODULES;
if (!toolsDir) throw new Error('Set DS_TOOLS_NODE_MODULES to a node_modules with playwright, pngjs and pixelmatch');
const require = createRequire(join(resolve(toolsDir), 'noop.js'));
const base = process.env.GITIARY_URL ?? 'http://127.0.0.1:5299';

const viewports = { desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844 } };
const themes = ['dark', 'light'];

// Full pages: the pilot pages plus every other screen, so unrelated changes show up in the diff.
const pages = [
	['home', '/'],
	['repo', '/repo/1'],
	['compare', '/compare'],
	['story', '/story'],
	['heat', '/heat'],
	['impact', '/impact'],
	['settings', '/settings']
];
// Crops of the migrated components.
const crops = [
	['settings-appearance', '/settings', '.settings-page > section:nth-of-type(1)'],
	['settings-branch', '/settings', '.settings-page > section:nth-of-type(4)'],
	['settings-sync', '/settings', '.settings-page > section:nth-of-type(5) .setting-item'],
	['repo-header', '/repo/1', '.repo-header'],
	['nav', '/settings', 'nav'],
	['modal-edit', '/settings', '.modal-content, dialog[open]', '.repo-item:first-of-type [title="Edit display name"]'],
	['modal-delete', '/settings', '.modal-content, dialog[open]', '.repo-item:first-of-type [title="Delete repository"]']
];

async function openPage(browser, viewport, theme, path) {
	const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
	await context.addInitScript((t) => localStorage.setItem('gitiary-theme', t), theme);
	const page = await context.newPage();
	const errors = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	await page.goto(base + path, { waitUntil: 'networkidle' });
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(1500); // ECharts entry animations
	return { context, page, errors };
}

async function capture(dir) {
	const { chromium } = require('playwright');
	mkdirSync(dir, { recursive: true });
	const browser = await chromium.launch();
	try {
		for (const [vpName, viewport] of Object.entries(viewports))
			for (const theme of themes) {
				for (const [name, path] of pages) {
					const { context, page, errors } = await openPage(browser, viewport, theme, path);
					await page.screenshot({ path: join(dir, `page-${name}-${vpName}-${theme}.png`), fullPage: true });
					if (errors.length) console.log(`${name} ${vpName} ${theme}: page errors`, errors);
					await context.close();
				}
				for (const [name, path, selector, click] of crops) {
					const { context, page } = await openPage(browser, viewport, theme, path);
					if (click) await page.locator(click).click();
					await page.locator(selector).first().screenshot({ path: join(dir, `crop-${name}-${vpName}-${theme}.png`) });
					await context.close();
				}
			}
	} finally {
		await browser.close();
	}
	console.log(`captured ${readdirSync(dir).length} images in ${dir}`);
}

function compare(beforeDir, afterDir) {
	const { PNG } = require('pngjs');
	const pixelmatch = require('pixelmatch').default ?? require('pixelmatch');
	const rows = [];
	for (const file of readdirSync(beforeDir).filter((f) => f.endsWith('.png')).sort()) {
		const afterPath = join(afterDir, file);
		if (!existsSync(afterPath)) {
			rows.push([file, 'missing']);
			continue;
		}
		const a = PNG.sync.read(readFileSync(join(beforeDir, file)));
		const b = PNG.sync.read(readFileSync(afterPath));
		if (a.width !== b.width || a.height !== b.height) {
			rows.push([file, `size ${a.width}x${a.height} -> ${b.width}x${b.height}`]);
			continue;
		}
		const diff = new PNG({ width: a.width, height: a.height });
		const changed = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0 });
		if (changed) writeFileSync(join(afterDir, file.replace('.png', '.diff.png')), PNG.sync.write(diff));
		rows.push([file, changed ? `${changed} px differ` : 'identical']);
	}
	for (const [file, result] of rows) console.log(`${result === 'identical' ? '  ' : '* '}${file}: ${result}`);
	console.log(`${rows.filter((r) => r[1] === 'identical').length}/${rows.length} identical`);
}

const [mode, a, b] = process.argv.slice(2);
if (mode === 'capture') await capture(a);
else if (mode === 'compare') compare(a, b);
else if (mode === 'verify') await (await import('./design-system-pilot-verify.mjs')).verify(require, base);
else throw new Error('usage: capture <dir> | compare <before> <after> | verify');
