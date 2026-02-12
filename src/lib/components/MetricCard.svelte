<script lang="ts">
	let { label, value, suffix = '' }: { label: string; value: number | string; suffix?: string } =
		$props();
</script>

<div class="metric-card">
	<div class="metric-value">
		{value}{#if suffix}<span class="suffix">{suffix}</span>{/if}
	</div>
	<div class="metric-label">{label}</div>
</div>

<style>
	.metric-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: var(--space-lg);
		text-align: center;
	}

	.metric-value {
		font-size: 2rem;
		font-weight: 700;
		font-family: var(--font-mono);
		color: var(--color-accent);
		line-height: 1;
		margin-bottom: var(--space-sm);
	}

	.suffix {
		font-size: 0.875rem;
		font-weight: 400;
		color: var(--color-text-secondary);
		margin-left: 4px;
	}

	.metric-label {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
</style>
