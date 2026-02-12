<script>
	import '../app.css';

	let { children, data } = $props();
</script>

<nav class="nav">
	<div class="container nav-inner">
		<div class="nav-brand-section">
			<a href="/" class="nav-brand">Git Diary</a>
			{#if data?.owner}
				<span class="nav-owner">{data.owner}</span>
			{/if}
		</div>
		<div class="nav-links">
			<a href="/">Repos</a>
			<a href="/compare">Compare</a>
			<a href="/story">Story</a>
		</div>
	</div>
</nav>

<main class="container main">
	{@render children()}
</main>

<style>
	.nav {
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		padding: var(--space-md) 0;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.nav-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.nav-brand-section {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.nav-brand {
		font-family: var(--font-mono);
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-text);
	}

	.nav-brand:hover {
		text-decoration: none;
		color: var(--color-accent);
	}

	.nav-owner {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		padding: 2px var(--space-sm);
		background: var(--color-surface-hover);
		border-radius: var(--radius);
	}

	.nav-links {
		display: flex;
		gap: var(--space-lg);
	}

	.nav-links a {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.nav-links a:hover {
		color: var(--color-text);
		text-decoration: none;
	}

	.main {
		padding-top: var(--space-xl);
		padding-bottom: var(--space-xl);
	}
</style>
