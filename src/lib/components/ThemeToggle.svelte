<script lang="ts">
	import { Moon, Sun } from 'lucide-svelte';
	import { theme } from '$lib/stores/theme';
</script>

<button
	class="theme-toggle"
	onclick={() => theme.toggle()}
	aria-label="Toggle theme"
	title={$theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
>
	{#if $theme === 'dark'}
		<Sun size={18} />
	{:else}
		<Moon size={18} />
	{/if}
</button>

<style>
	.theme-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: var(--space-sm);
		border-radius: var(--radius);
		transition: all 0.2s ease;
	}

	.theme-toggle:hover {
		color: var(--color-text);
		background: var(--color-surface-hover);
	}
</style>
