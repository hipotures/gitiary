// Browser checks for the components migrated to the shared design system. Run through
// `node scripts/design-system-pilot.mjs verify`. Every API call that would write is intercepted, so the database is
// never changed.
const results = [];
const check = (name, ok, detail = '') => {
	results.push({ name, ok });
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
};

const accent = { dark: 'rgb(88, 166, 255)', light: 'rgb(9, 105, 218)' };

async function open(browser, path, { theme = 'dark', viewport = { width: 1280, height: 900 } } = {}) {
	const context = await browser.newContext({ viewport });
	await context.addInitScript((t) => localStorage.setItem('gitiary-theme', t), theme);
	const page = await context.newPage();
	const errors = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
	await page.goto(path, { waitUntil: 'networkidle' });
	return { context, page, errors };
}

// .ds-btn transitions every property, so styles are read only after running transitions end.
const settle = (page) => page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished)));

const focusedInfo = async (page) => {
	await settle(page);
	return page.evaluate(() => {
		const el = document.activeElement;
		const cs = getComputedStyle(el);
		return {
			text: (el.textContent || el.id || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' '),
			ds: Boolean(el.closest('.ds-btn, .ds-segmented, .ds-field')),
			outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
			visible: el.matches(':focus-visible')
		};
	});
};

export async function verify(require, base) {
	const { chromium } = require('playwright');
	const browser = await chromium.launch();
	try {
		// ---- Theme switching through the segmented control and the nav toggle ----
		{
			const { context, page, errors } = await open(browser, `${base}/settings`);
			const group = page.getByRole('group', { name: 'Theme' });
			const dark = group.getByRole('button', { name: 'Dark' });
			const light = group.getByRole('button', { name: 'Light' });
			check('theme group has an accessible name', (await group.count()) === 1);
			check('dark pressed initially', (await dark.getAttribute('aria-pressed')) === 'true' && (await light.getAttribute('aria-pressed')) === 'false');
			const panelBg = () => page.locator('.ds-panel').first().evaluate((el) => getComputedStyle(el).backgroundColor);
			const darkBg = await panelBg();
			await light.click();
			const state = await page.evaluate(() => ({
				theme: document.documentElement.dataset.theme,
				stored: localStorage.getItem('gitiary-theme'),
				scheme: getComputedStyle(document.documentElement).colorScheme
			}));
			check('Light click switches the document theme', state.theme === 'light' && state.stored === 'light' && state.scheme === 'light', JSON.stringify(state));
			check('aria-pressed follows the store', (await light.getAttribute('aria-pressed')) === 'true' && (await dark.getAttribute('aria-pressed')) === 'false');
			check('panel tokens change with the theme', (await panelBg()) !== darkBg, `${darkBg} -> ${await panelBg()}`);
			const primary = page.locator('.sync-button');
			await settle(page);
			check('primary button uses the Gitiary light accent', (await primary.evaluate((el) => getComputedStyle(el).backgroundColor)) === accent.light);
			await page.getByRole('button', { name: 'Toggle theme' }).click();
			await settle(page);
			check('nav toggle updates the segmented control', (await dark.getAttribute('aria-pressed')) === 'true' && (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
			check('primary button uses the Gitiary dark accent', (await primary.evaluate((el) => getComputedStyle(el).backgroundColor)) === accent.dark);
			check('no page errors on settings', errors.length === 0, errors.join('; '));
			await context.close();
		}

		// ---- Keyboard: tab order, visible focus ring, activation ----
		for (const theme of ['dark', 'light']) {
			const { context, page } = await open(browser, `${base}/settings`, { theme });
			const seen = [];
			for (let i = 0; i < 40; i++) {
				await page.keyboard.press('Tab');
				const info = await focusedInfo(page);
				if (info.ds) seen.push(info);
			}
			const names = seen.map((s) => s.text);
			for (const want of ['Dark', 'Light', 'Save', 'default-branch', 'Sync with GitHub'])
				check(`${theme}: "${want}" reachable by Tab`, names.some((n) => n.includes(want)), names.join(' | '));
			const bad = seen.filter((s) => !s.visible || !s.outline.startsWith(`solid 2px ${accent[theme]}`));
			check(`${theme}: every migrated control shows the accent focus ring`, bad.length === 0, bad.map((b) => `${b.text}: ${b.outline}`).join('; '));
			// Activate the other theme option with the keyboard.
			const other = theme === 'dark' ? 'Light' : 'Dark';
			await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: other }).focus();
			await page.keyboard.press('Space');
			check(`${theme}: Space on "${other}" switches the theme`, (await page.evaluate(() => document.documentElement.dataset.theme)) === other.toLowerCase());
			await context.close();
		}

		// ---- Field binding and disabled state while saving ----
		{
			const { context, page } = await open(browser, `${base}/settings`);
			let release;
			const gate = new Promise((r) => (release = r));
			let body = null;
			await page.route('**/api/settings', async (route) => {
				if (route.request().method() !== 'PATCH') return route.continue();
				body = route.request().postDataJSON();
				await gate;
				await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
			});
			const input = page.locator('#default-branch');
			check('label is associated with the field', (await page.getByLabel('Default Branch Name').count()) === 1);
			await input.fill('trunk');
			const save = page.locator('.branch-input-group .ds-btn');
			const idle = await save.evaluate((el) => getComputedStyle(el).backgroundColor);
			await save.click();
			await page.waitForFunction(() => document.querySelector('.branch-input-group .ds-btn')?.disabled);
			await settle(page);
			const disabled = await save.evaluate((el) => ({ text: el.textContent.trim(), opacity: getComputedStyle(el).opacity, cursor: getComputedStyle(el).cursor }));
			check('Save is disabled while saving', disabled.text === 'Saving...' && disabled.opacity === '0.45' && disabled.cursor === 'not-allowed', JSON.stringify(disabled));
			await save.hover({ force: true });
			await settle(page);
			const hovered = await save.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, transform: getComputedStyle(el).transform }));
			check('hover does not restyle the disabled button', hovered.bg === idle && hovered.transform === 'none', JSON.stringify(hovered));
			release();
			await page.getByText('Saved').waitFor();
			check('bound value is sent', body?.defaultBranch === 'trunk', JSON.stringify(body));
			check('Save is enabled again', !(await save.isDisabled()));

			await page.route('**/api/repos/sync', (route) => route.fulfill({ status: 500, body: '' }));
			await page.locator('.sync-button').click();
			await page.getByText('Failed to sync with GitHub').waitFor();
			check('sync failure keeps the page and re-enables the button', !(await page.locator('.sync-button').isDisabled()));
			await context.close();
		}

		// ---- Modals ----
		{
			const { context, page } = await open(browser, `${base}/settings`);
			let patched = null;
			await page.route('**/api/repos/*', async (route) => {
				if (route.request().method() === 'GET') return route.continue();
				patched = { method: route.request().method(), body: route.request().postData() };
				await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
			});
			await page.locator('.repo-item').first().locator('[title="Edit display name"]').click();
			await page.locator('#displayName').fill('Alpha');
			await page.locator('.modal-actions .ds-btn-primary').click();
			check('edit modal Save sends the bound value', patched?.method === 'PATCH' && patched.body.includes('Alpha'), JSON.stringify(patched));
			patched = null;
			await page.locator('.repo-item').first().locator('[title="Delete repository"]').click();
			await page.locator('.modal-actions .ds-btn', { hasText: 'Cancel' }).click();
			check('delete modal Cancel closes without a request', (await page.locator('.modal-content').count()) === 0 && patched === null);
			await page.locator('.repo-item').first().locator('[title="Delete repository"]').click();
			const danger = await page.locator('.ds-btn-danger').evaluate((el) => getComputedStyle(el).color);
			check('delete uses the danger button', danger !== 'rgb(255, 255, 255)', danger);
			await page.locator('.ds-btn-danger').click();
			check('delete confirm sends DELETE', patched?.method === 'DELETE', JSON.stringify(patched));
			await context.close();
		}

		// ---- Badges ----
		for (const theme of ['dark', 'light']) {
			const { context, page } = await open(browser, `${base}/repo/1`, { theme });
			const fork = page.locator('.repo-title-group .ds-badge[data-tone="accent"]');
			check(`${theme}: fork badge has a text label`, (await fork.textContent())?.trim() === 'Fork');
			check(`${theme}: fork badge uses the accent`, (await fork.evaluate((el) => getComputedStyle(el).color)) === accent[theme]);
			check(`${theme}: branch badge has a text label`, (await page.locator('.repo-title-group .ds-badge:not([data-tone])').textContent())?.trim() === 'Extra branches');
			await context.close();
		}

		// ---- Layout: nothing in a migrated panel is clipped or overflows it ----
		for (const [name, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
			const { context, page } = await open(browser, `${base}/settings`, { viewport });
			const overflow = await page.evaluate(() => {
				const out = [];
				for (const panel of document.querySelectorAll('.ds-panel')) {
					const p = panel.getBoundingClientRect();
					for (const el of panel.querySelectorAll('.ds-panel-head, .setting-item, select, input, textarea, .ds-btn, .ds-segmented')) {
						const r = el.getBoundingClientRect();
						if (r.width && (r.right > p.right + 0.5 || r.left < p.left - 0.5)) out.push(`${el.className || el.tagName} ${Math.round(r.right)} > ${Math.round(p.right)}`);
					}
				}
				return out;
			});
			check(`${name}: migrated panels contain their controls`, overflow.length === 0, overflow.join('; '));
			const { context: c2, page: p2 } = await open(browser, `${base}/repo/1`, { viewport });
			const badges = await p2.evaluate(() => [...document.querySelectorAll('.repo-title-group .ds-badge')].map((b) => b.getBoundingClientRect().right <= document.documentElement.clientWidth));
			check(`${name}: repo badges stay inside the viewport`, badges.length === 2 && badges.every(Boolean));
			await c2.close();
			await context.close();
		}
	} finally {
		await browser.close();
	}
	const failed = results.filter((r) => !r.ok).length;
	console.log(`${results.length - failed}/${results.length} checks passed`);
	if (failed) process.exitCode = 1;
}
