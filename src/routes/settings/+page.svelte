<script lang="ts">
	import { Moon, Sun, RefreshCw, CheckSquare, Square, Trash2 } from 'lucide-svelte';
	import { theme } from '$lib/stores/theme';

	interface Repo {
		id: number;
		owner: string;
		name: string;
		isActive: boolean;
		lastSyncAt: string | null;
	}

	interface PageData {
		version: string;
		repos: Repo[];
		lastGithubSync: string | null;
	}

	let { data }: { data: PageData } = $props();

	let repos = $state(data.repos);
	let isSyncing = $state(false);
	let syncMessage = $state('');
	let syncingRepoId = $state<number | null>(null);
	let deletingRepoId = $state<number | null>(null);
	let deleteConfirmRepo = $state<{ id: number; name: string } | null>(null);

	async function syncWithGitHub() {
		isSyncing = true;
		syncMessage = '';

		try {
			const response = await fetch('/api/repos/sync', {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Sync failed');
			}

			const result = await response.json();
			syncMessage = `Synced ${result.total} repositories (${result.added} new)`;

			// Reload page data
			window.location.reload();
		} catch (error) {
			syncMessage = 'Failed to sync with GitHub';
			console.error(error);
		} finally {
			isSyncing = false;
		}
	}

	async function toggleRepoActive(repoId: number, currentlyActive: boolean) {
		try {
			const response = await fetch(`/api/repos/${repoId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: !currentlyActive })
			});

			if (!response.ok) {
				throw new Error('Update failed');
			}

			// Update local state
			repos = repos.map((r) => (r.id === repoId ? { ...r, isActive: !currentlyActive } : r));

			// Re-sort after toggle
			repos = repos.sort((a, b) => {
				if (a.isActive !== b.isActive) {
					return a.isActive ? -1 : 1;
				}
				const fullNameA = `${a.owner}/${a.name}`;
				const fullNameB = `${b.owner}/${b.name}`;
				return fullNameA.localeCompare(fullNameB);
			});
		} catch (error) {
			console.error('Failed to toggle repo:', error);
		}
	}

	async function syncSingleRepo(repoId: number, backfillDays: number) {
		syncingRepoId = repoId;

		try {
			const response = await fetch(`/api/repos/${repoId}/sync`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ backfillDays })
			});

			if (!response.ok) {
				throw new Error('Sync failed');
			}

			// Update lastSyncAt in local state
			repos = repos.map((r) =>
				r.id === repoId ? { ...r, lastSyncAt: new Date().toISOString() } : r
			);
		} catch (error) {
			console.error('Failed to sync repo:', error);
		} finally {
			syncingRepoId = null;
		}
	}

	function showDeleteConfirm(repoId: number, repoName: string) {
		deleteConfirmRepo = { id: repoId, name: repoName };
	}

	async function confirmDelete() {
		if (!deleteConfirmRepo) return;

		const repoId = deleteConfirmRepo.id;
		deleteConfirmRepo = null;
		deletingRepoId = repoId;

		try {
			const response = await fetch(`/api/repos/${repoId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Delete failed');
			}

			// Remove from local state
			repos = repos.filter((r) => r.id !== repoId);
		} catch (error) {
			console.error('Failed to delete repo:', error);
		} finally {
			deletingRepoId = null;
		}
	}

	function cancelDelete() {
		deleteConfirmRepo = null;
	}
</script>

<div class="settings-page">
	<div class="settings-header">
		<h1>Settings</h1>
		<span class="version">v{data.version}</span>
	</div>

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

	<!-- Repository Management Section -->
	<section class="settings-section">
		<h2>Repository Management</h2>

		<div class="setting-item">
			<div class="setting-info">
				<label>GitHub Sync</label>
				<p class="setting-description">
					Sync your repository list from GitHub. New repositories will be added as inactive.
				</p>
				{#if data.lastGithubSync}
					<p class="last-sync-info">
						Last synced: {new Date(data.lastGithubSync).toLocaleString('en-GB', {
							year: 'numeric',
							month: '2-digit',
							day: '2-digit',
							hour: '2-digit',
							minute: '2-digit'
						})}
					</p>
				{/if}
				{#if syncMessage}
					<p class="sync-message" class:error={syncMessage.includes('Failed')}>
						{syncMessage}
					</p>
				{/if}
			</div>
			<button class="sync-button" onclick={syncWithGitHub} disabled={isSyncing}>
				<RefreshCw size={18} class={isSyncing ? 'spinning' : ''} />
				<span>{isSyncing ? 'Syncing...' : 'Sync with GitHub'}</span>
			</button>
		</div>

		<div class="repos-list">
			<div class="repos-header">
				<span class="repos-count">{repos.length} repositories</span>
				<span class="repos-hint">Check repositories to include in charts and statistics</span>
			</div>

			<div class="repos-scroll">
				{#each repos as repo (repo.id)}
					<label class="repo-item" class:inactive={!repo.isActive}>
						<button
							type="button"
							class="checkbox-button"
							onclick={() => toggleRepoActive(repo.id, repo.isActive)}
						>
							{#if repo.isActive}
								<CheckSquare size={20} class="checkbox-icon active" />
							{:else}
								<Square size={20} class="checkbox-icon" />
							{/if}
						</button>
						<div class="repo-info">
							<span class="repo-name">{repo.owner}/{repo.name}</span>
							{#if repo.lastSyncAt}
								<span class="repo-sync">
									Last sync: {new Date(repo.lastSyncAt).toLocaleString('en-GB', {
										year: 'numeric',
										month: '2-digit',
										day: '2-digit',
										hour: '2-digit',
										minute: '2-digit'
									})}
								</span>
							{/if}
						</div>

						{#if repo.isActive}
							<div class="repo-actions">
								<button
									class="action-btn"
									onclick={(e) => {
										e.preventDefault();
										syncSingleRepo(repo.id, 0);
									}}
									disabled={syncingRepoId === repo.id}
									title="Sync all commits"
								>
									<RefreshCw
										size={14}
										class={syncingRepoId === repo.id ? 'spinning' : ''}
									/>
									<span>All</span>
								</button>
								<button
									class="action-btn"
									onclick={(e) => {
										e.preventDefault();
										syncSingleRepo(repo.id, 30);
									}}
									disabled={syncingRepoId === repo.id}
									title="Sync last 30 days"
								>
									<RefreshCw
										size={14}
										class={syncingRepoId === repo.id ? 'spinning' : ''}
									/>
									<span>30d</span>
								</button>
							</div>
						{/if}

						<button
							class="delete-btn"
							onclick={(e) => {
								e.preventDefault();
								showDeleteConfirm(repo.id, `${repo.owner}/${repo.name}`);
							}}
							disabled={deletingRepoId === repo.id}
							title="Delete repository"
						>
							<Trash2 size={16} />
						</button>
					</label>
				{/each}
			</div>
		</div>
	</section>
</div>

{#if deleteConfirmRepo}
	<div class="modal-overlay" onclick={cancelDelete}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<h3>Delete Repository</h3>
			<p>
				Are you sure you want to delete <strong>{deleteConfirmRepo.name}</strong>?
			</p>
			<p class="modal-warning">This will remove all commit data for this repository.</p>
			<div class="modal-actions">
				<button class="modal-btn cancel" onclick={cancelDelete}>Cancel</button>
				<button class="modal-btn confirm" onclick={confirmDelete}>Delete</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.settings-page {
		max-width: 800px;
	}

	.settings-header {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}

	.settings-header h1 {
		margin: 0;
	}

	.version {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		font-weight: 500;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
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

	.sync-message {
		font-size: 0.875rem;
		margin-top: var(--space-xs);
		color: var(--color-success);
	}

	.sync-message.error {
		color: var(--color-error);
	}

	.sync-button {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-accent);
		color: white;
		border: none;
		border-radius: var(--radius);
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		transition: opacity 0.2s ease;
	}

	.sync-button:hover:not(:disabled) {
		opacity: 0.9;
	}

	.sync-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.sync-button :global(.spinning) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.repos-list {
		margin-top: var(--space-lg);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border);
	}

	.repos-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-md);
	}

	.repos-count {
		font-weight: 500;
		font-size: 0.875rem;
	}

	.repos-hint {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.repos-scroll {
		max-height: 400px;
		overflow-y: auto;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
	}

	.repo-item {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		border-bottom: 1px solid var(--color-border);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.repo-item:last-child {
		border-bottom: none;
	}

	.repo-item:hover {
		background: var(--color-surface-hover);
	}

	.repo-item.inactive {
		opacity: 0.6;
	}

	.checkbox-button {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: var(--color-text-secondary);
		transition: color 0.15s ease;
	}

	.checkbox-button:hover {
		color: var(--color-text);
	}

	.checkbox-icon.active {
		color: var(--color-accent);
	}

	.repo-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.repo-name {
		font-weight: 500;
		font-size: 0.875rem;
	}

	.repo-sync {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.last-sync-info {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		margin-top: var(--space-xs);
		font-style: italic;
	}

	.repo-actions {
		display: flex;
		gap: var(--space-xs);
		margin-left: auto;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		color: var(--color-text);
		cursor: pointer;
		font-size: 0.75rem;
		transition: all 0.15s ease;
	}

	.action-btn:hover:not(:disabled) {
		background: var(--color-surface-hover);
		border-color: var(--color-accent);
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.action-btn :global(.spinning) {
		animation: spin 1s linear infinite;
	}

	.delete-btn {
		background: none;
		border: none;
		padding: var(--space-xs);
		cursor: pointer;
		color: var(--color-text-secondary);
		transition: color 0.15s ease;
		border-radius: var(--radius);
	}

	.delete-btn:hover:not(:disabled) {
		color: var(--color-error);
		background: var(--color-surface-hover);
	}

	.delete-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(4px);
	}

	.modal-content {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: var(--space-lg);
		max-width: 480px;
		width: 90%;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
	}

	.modal-content h3 {
		margin: 0 0 var(--space-md) 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.modal-content p {
		margin: 0 0 var(--space-sm) 0;
		color: var(--color-text);
		line-height: 1.5;
	}

	.modal-content strong {
		color: var(--color-accent);
		font-weight: 600;
	}

	.modal-warning {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		margin-bottom: var(--space-lg) !important;
	}

	.modal-actions {
		display: flex;
		gap: var(--space-sm);
		justify-content: flex-end;
	}

	.modal-btn {
		padding: var(--space-sm) var(--space-lg);
		border: none;
		border-radius: var(--radius);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.modal-btn.cancel {
		background: var(--color-surface-hover);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.modal-btn.cancel:hover {
		background: var(--color-bg);
	}

	.modal-btn.confirm {
		background: var(--color-error);
		color: white;
	}

	.modal-btn.confirm:hover {
		opacity: 0.9;
	}
</style>
