<script lang="ts">
	import { Moon, Sun } from 'lucide-svelte';
	import { theme } from '$lib/stores/theme';
</script>

<div class="settings-page">
	<h1>Settings</h1>

	<section class="settings-section">
		<h2>Appearance</h2>

		<div class="setting-item">
			<div class="setting-info">
				<label for="theme-select">Theme</label>
				<p class="setting-description">Choose how Git Diary looks to you.</p>
			</div>

			<div class="theme-options">
				<button
					class="theme-option"
					class:active={$theme === 'dark'}
					onclick={() => theme.set('dark')}
				>
					<Moon size={20} />
					<span>Dark</span>
				</button>

				<button
					class="theme-option"
					class:active={$theme === 'light'}
					onclick={() => theme.set('light')}
				>
					<Sun size={20} />
					<span>Light</span>
				</button>
			</div>
		</div>
	</section>
</div>

<style>
	.settings-page {
		max-width: 800px;
	}

	.settings-section {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: var(--space-lg);
		margin-bottom: var(--space-lg);
	}

	.settings-section h2 {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--color-border);
	}

	.setting-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-lg);
	}

	.setting-info {
		flex: 1;
	}

	.setting-info label {
		display: block;
		font-weight: 500;
		margin-bottom: var(--space-xs);
	}

	.setting-description {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.theme-options {
		display: flex;
		gap: var(--space-sm);
	}

	.theme-option {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg);
		border: 2px solid var(--color-border);
		border-radius: var(--radius);
		color: var(--color-text);
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s ease;
	}

	.theme-option:hover {
		border-color: var(--color-text-secondary);
	}

	.theme-option.active {
		border-color: var(--color-accent);
		background: var(--color-surface-hover);
	}
</style>
