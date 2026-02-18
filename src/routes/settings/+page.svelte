<script lang="ts">
	import { Moon, Sun, RefreshCw, CheckSquare, Square, Trash2, Pencil, GitFork } from 'lucide-svelte';
	import { theme } from '$lib/stores/theme';
	import { repoSort } from '$lib/stores/repoSort';
	import { impactDailyPageSize, type ImpactDailyPageSize } from '$lib/stores/impactPagination';
	import type { RepoSortField, SortDirection } from '$lib/domain/repoSort';

	interface Repo {
		id: number;
		owner: string;
		name: string;
		displayName: string | null;
		isActive: boolean;
		isFork: boolean;
		lastSyncAt: string | null;
		lastPushedAt: string | null;
	}

	interface PageData {
		version: string;
		repos: Repo[];
		lastGithubSync: string | null;
		authorEmails: string[];
	}

	let { data }: { data: PageData } = $props();

	let repos = $state(data.repos);
	let isSyncing = $state(false);
	let syncMessage = $state('');
	let syncingRepoId = $state<number | null>(null);
	let syncingMode = $state<'full' | 'backfill' | null>(null);
	let deletingRepoId = $state<number | null>(null);
	let deleteConfirmRepo = $state<{ id: number; name: string } | null>(null);
	let editingRepo = $state<{ id: number; name: string; displayName: string | null } | null>(null);
	let editDisplayName = $state('');

	// Author emails
	let authorEmailsText = $state(data.authorEmails.join('\n'));
	let isSavingEmails = $state(false);
	let emailsSaveMessage = $state('');

	// Sort preferences
	let sortField = $state<RepoSortField>($repoSort.field);
	let sortDirection = $state<SortDirection>($repoSort.direction);
	let dailyPageSize = $state<ImpactDailyPageSize>($impactDailyPageSize);

	function hasNewCommits(r: Repo): boolean {
		if (!r.lastPushedAt) return false;
		if (!r.lastSyncAt) return true;
		return r.lastPushedAt > r.lastSyncAt;
	}

	function pushedWithin30Days(pushedAt: string): boolean {
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
		return pushedAt > thirtyDaysAgo;
	}

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

	async function syncSingleRepo(
		repoId: number,
		options: { mode: 'full' | 'backfill'; backfillDays?: number }
	) {
		syncingRepoId = repoId;
		syncingMode = options.mode;

		try {
			const response = await fetch(`/api/repos/${repoId}/sync`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mode: options.mode,
					backfillDays: options.backfillDays
				})
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
			syncingMode = null;
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

	function showEditDisplayName(repoId: number, repoName: string, currentDisplayName: string | null) {
		editingRepo = { id: repoId, name: repoName, displayName: currentDisplayName };
		editDisplayName = currentDisplayName || '';
	}

	async function saveDisplayName() {
		if (!editingRepo) return;

		const repoId = editingRepo.id;
		const newDisplayName = editDisplayName.trim() || null;

		try {
			const response = await fetch(`/api/repos/${repoId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ displayName: newDisplayName })
			});

			if (!response.ok) {
				throw new Error('Update failed');
			}

			// Update local state
			repos = repos.map((r) =>
				r.id === repoId ? { ...r, displayName: newDisplayName } : r
			);

			editingRepo = null;
			editDisplayName = '';
		} catch (error) {
			console.error('Failed to update display name:', error);
		}
	}

	function cancelEditDisplayName() {
		editingRepo = null;
		editDisplayName = '';
	}

	async function saveAuthorEmails() {
		isSavingEmails = true;
		emailsSaveMessage = '';

		try {
			const emails = authorEmailsText
				.split(/[\s,]+/)
				.map((e) => e.trim())
				.filter((e) => e.length > 0);

			const response = await fetch('/api/settings', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ authorEmails: emails })
			});

			if (!response.ok) {
				throw new Error('Save failed');
			}

			emailsSaveMessage = 'Saved';
		} catch (error) {
			emailsSaveMessage = 'Failed to save';
			console.error(error);
		} finally {
			isSavingEmails = false;
		}
	}

	async function toggleFork(repoId: number, currentIsFork: boolean) {
		try {
			const response = await fetch(`/api/repos/${repoId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isFork: !currentIsFork })
			});

			if (!response.ok) {
				throw new Error('Update failed');
			}

			repos = repos.map((r) => (r.id === repoId ? { ...r, isFork: !currentIsFork } : r));
		} catch (error) {
			console.error('Failed to toggle fork status:', error);
		}
	}

	function handleSortChange() {
		repoSort.set({ field: sortField, direction: sortDirection });
	}

	function handleDailyPageSizeChange() {
		impactDailyPageSize.set(dailyPageSize);
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
				<p class="setting-description">Choose how gitiary looks to you.</p>
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

	<!-- Repository Display Section -->
	<section class="settings-section">
		<h2>Repository Display</h2>

		<div class="setting-item">
			<div class="setting-info">
				<label>Default Sort Order</label>
				<p class="setting-description">
					Choose how repositories are sorted on the main page by default.
				</p>
			</div>

			<div class="sort-options">
				<select bind:value={sortField} onchange={handleSortChange}>
					<option value="name">Alphabetical (Name)</option>
					<option value="firstCommitDate">First Commit Date</option>
					<option value="totalCommits">Total Commits</option>
				</select>

				<select bind:value={sortDirection} onchange={handleSortChange}>
					<option value="asc">Ascending</option>
					<option value="desc">Descending</option>
				</select>
			</div>
		</div>

		<div class="setting-item">
			<div class="setting-info">
				<label for="daily-page-size-select">Impact Daily Table Page Size</label>
				<p class="setting-description">
					Number of rows per page for "Daily Commit Activity with Changes".
				</p>
			</div>

			<div class="sort-options">
				<select
					id="daily-page-size-select"
					bind:value={dailyPageSize}
					onchange={handleDailyPageSizeChange}
				>
					<option value={10}>10</option>
					<option value={30}>30</option>
					<option value={50}>50</option>
					<option value={100}>100</option>
				</select>
			</div>
		</div>
	</section>

	<!-- Author Emails Section -->
	<section class="settings-section">
		<h2>Fork Filtering</h2>

		<div class="setting-item setting-item-column">
			<div class="setting-info">
				<label for="author-emails">Author Emails</label>
				<p class="setting-description">
					Emails used to filter commits in fork repositories. One email per line.
					When a repo is marked as fork, only commits by these authors will be synced.
				</p>
			</div>
			<div class="emails-input-group">
				<textarea
					id="author-emails"
					class="emails-textarea"
					bind:value={authorEmailsText}
					placeholder={"user@example.com\nuser@users.noreply.github.com"}
					rows={4}
				></textarea>
				<div class="emails-actions">
					<button
						class="save-emails-btn"
						onclick={saveAuthorEmails}
						disabled={isSavingEmails}
					>
						{isSavingEmails ? 'Saving...' : 'Save'}
					</button>
					{#if emailsSaveMessage}
						<span class="emails-save-msg" class:error={emailsSaveMessage.includes('Failed')}>
							{emailsSaveMessage}
						</span>
					{/if}
				</div>
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
							<div class="repo-names-inline">
								<span class="repo-name">{repo.owner}/{repo.name}</span>
								{#if repo.displayName}
									<span class="repo-display-name">{repo.displayName}</span>
								{/if}
							</div>
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

						<div class="repo-actions">
							<button
								type="button"
								class="action-btn fork-btn"
								class:fork-active={repo.isFork}
								onclick={(e) => {
									e.preventDefault();
									toggleFork(repo.id, repo.isFork);
								}}
								title={repo.isFork ? 'Marked as fork — click to unmark' : 'Mark as fork'}
								aria-label="Toggle fork status"
							>
								<GitFork size={16} />
							</button>
							{#if repo.isActive}
								<button
									class="action-btn sync-all"
									class:needs-sync={hasNewCommits(repo) && repo.lastPushedAt !== null && !pushedWithin30Days(repo.lastPushedAt)}
									onclick={(e) => {
										e.preventDefault();
										syncSingleRepo(repo.id, { mode: 'full' });
									}}
									disabled={syncingRepoId === repo.id}
									title="Sync all commits"
									aria-label="Sync all commits"
								>
									<RefreshCw
										size={16}
										strokeWidth={2.6}
										class={syncingRepoId === repo.id && syncingMode === 'full' ? 'spinning' : ''}
									/>
								</button>
								<button
									class="action-btn sync-30d"
									class:needs-sync={hasNewCommits(repo) && repo.lastPushedAt !== null && pushedWithin30Days(repo.lastPushedAt)}
									onclick={(e) => {
										e.preventDefault();
										syncSingleRepo(repo.id, { mode: 'backfill', backfillDays: 30 });
									}}
									disabled={syncingRepoId === repo.id}
									title="Sync last 30 days"
									aria-label="Sync last 30 days"
								>
									<RefreshCw
										size={16}
										strokeWidth={1.6}
										class={syncingRepoId === repo.id && syncingMode === 'backfill'
											? 'spinning'
											: ''}
									/>
								</button>
							{/if}
						</div>

						<button
							class="edit-btn"
							onclick={(e) => {
								e.preventDefault();
								showEditDisplayName(repo.id, `${repo.owner}/${repo.name}`, repo.displayName);
							}}
							title="Edit display name"
						>
							<Pencil size={16} />
						</button>

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

{#if editingRepo}
	<div class="modal-overlay" onclick={cancelEditDisplayName}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<h3>Edit Display Name</h3>
			<p class="repo-identifier">Repository: <strong>{editingRepo.name}</strong></p>
			<p class="modal-description">
				Set a custom display name for this repository. Leave empty to use the original name.
			</p>

			<div class="form-group">
				<label for="displayName">Display Name</label>
				<input
					id="displayName"
					type="text"
					bind:value={editDisplayName}
					placeholder="Custom display name"
					class="text-input"
				/>
			</div>

			<div class="modal-actions">
				<button class="modal-btn cancel" onclick={cancelEditDisplayName}>Cancel</button>
				<button class="modal-btn save" onclick={saveDisplayName}>Save</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.settings-page {
		/* Width constraint removed to match other pages */
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

	.sort-options {
		display: flex;
		gap: var(--space-sm);
	}

	.sort-options select {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg);
		border: 2px solid var(--color-border);
		border-radius: var(--radius);
		color: var(--color-text);
		cursor: pointer;
		font-size: 0.875rem;
		transition: border-color 0.2s ease;
	}

	.sort-options select:hover {
		border-color: var(--color-text-secondary);
	}

	.sort-options select:focus {
		outline: none;
		border-color: var(--color-accent);
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
		gap: var(--space-md);
		margin-left: auto;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: 1px solid transparent;
		width: 30px;
		height: 30px;
		padding: 0;
		cursor: pointer;
		color: var(--color-text-secondary);
		transition:
			color 0.15s ease,
			background 0.15s ease,
			border-color 0.15s ease,
			box-shadow 0.15s ease;
		border-radius: var(--radius);
	}

	.action-btn:hover:not(:disabled) {
		background: var(--color-surface-hover);
		color: var(--color-accent);
		border-color: var(--color-accent);
		box-shadow: 0 0 0 1px var(--color-accent);
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.action-btn.sync-30d {
		color: var(--color-text-secondary);
		opacity: 0.72;
	}

	.action-btn.sync-30d:hover:not(:disabled) {
		opacity: 1;
	}

	.action-btn:focus-visible:not(:disabled) {
		outline: none;
		color: var(--color-accent);
		border-color: var(--color-accent);
		box-shadow: 0 0 0 1px var(--color-accent);
		background: var(--color-surface-hover);
	}

	.action-btn :global(.spinning) {
		animation: spin 1s linear infinite;
	}

	.delete-btn {
		background: none;
		border: 1px solid transparent;
		width: 30px;
		height: 30px;
		padding: 0;
		cursor: pointer;
		color: var(--color-text-secondary);
		transition:
			color 0.15s ease,
			background 0.15s ease,
			border-color 0.15s ease,
			box-shadow 0.15s ease;
		border-radius: var(--radius);
	}

	.delete-btn:hover:not(:disabled) {
		color: var(--color-accent);
		background: var(--color-surface-hover);
		border-color: var(--color-accent);
		box-shadow: 0 0 0 1px var(--color-accent);
	}

	.delete-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.delete-btn:focus-visible:not(:disabled) {
		outline: none;
		color: var(--color-accent);
		border-color: var(--color-accent);
		box-shadow: 0 0 0 1px var(--color-accent);
		background: var(--color-surface-hover);
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

	.modal-btn.save {
		background: var(--color-accent);
		color: white;
	}

	.modal-btn.save:hover {
		opacity: 0.9;
	}

	.repo-names-inline {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.repo-display-name {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		font-style: italic;
	}

	.edit-btn {
		background: none;
		border: 1px solid transparent;
		width: 30px;
		height: 30px;
		padding: 0;
		cursor: pointer;
		color: var(--color-text-secondary);
		transition:
			color 0.15s ease,
			background 0.15s ease,
			border-color 0.15s ease,
			box-shadow 0.15s ease;
		border-radius: var(--radius);
	}

	.edit-btn:hover {
		color: var(--color-accent);
		background: var(--color-surface-hover);
		border-color: var(--color-accent);
		box-shadow: 0 0 0 1px var(--color-accent);
	}

	.edit-btn:focus-visible {
		outline: none;
		color: var(--color-accent);
		background: var(--color-surface-hover);
		border-color: var(--color-accent);
		box-shadow: 0 0 0 1px var(--color-accent);
	}

	.repo-identifier {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		padding: var(--space-sm);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		margin-bottom: var(--space-md);
	}

	.modal-description {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin-bottom: var(--space-lg) !important;
	}

	.form-group {
		margin-bottom: var(--space-lg);
	}

	.form-group label {
		display: block;
		font-weight: 500;
		margin-bottom: var(--space-sm);
		font-size: 0.875rem;
	}

	.text-input {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg);
		border: 2px solid var(--color-border);
		border-radius: var(--radius);
		color: var(--color-text);
		font-size: 0.875rem;
		transition: border-color 0.2s ease;
	}

	.text-input:focus {
		outline: none;
		border-color: var(--color-accent);
	}

	.text-input::placeholder {
		color: var(--color-text-secondary);
		opacity: 0.6;
	}

	.setting-item-column {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-md);
	}

	.emails-input-group {
		width: 100%;
	}

	.emails-textarea {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg);
		border: 2px solid var(--color-border);
		border-radius: var(--radius);
		color: var(--color-text);
		font-size: 0.875rem;
		font-family: var(--font-mono);
		resize: vertical;
		transition: border-color 0.2s ease;
		box-sizing: border-box;
	}

	.emails-textarea:focus {
		outline: none;
		border-color: var(--color-accent);
	}

	.emails-textarea::placeholder {
		color: var(--color-text-secondary);
		opacity: 0.6;
	}

	.emails-actions {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin-top: var(--space-sm);
	}

	.save-emails-btn {
		padding: var(--space-xs) var(--space-md);
		background: var(--color-accent);
		color: white;
		border: none;
		border-radius: var(--radius);
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		transition: opacity 0.2s ease;
	}

	.save-emails-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.save-emails-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.emails-save-msg {
		font-size: 0.875rem;
		color: var(--color-success);
	}

	.emails-save-msg.error {
		color: var(--color-error);
	}

	.action-btn.fork-btn {
		opacity: 0.25;
		color: var(--color-text-secondary);
		border-color: transparent;
	}

	.action-btn.fork-btn:hover:not(:disabled) {
		opacity: 1;
		color: var(--color-accent);
		border-color: var(--color-accent);
		box-shadow: 0 0 0 1px var(--color-accent);
		background: var(--color-surface-hover);
	}

	.action-btn.fork-btn.fork-active {
		opacity: 1;
		color: var(--color-accent);
		border-color: var(--color-accent);
		box-shadow: 0 0 0 1px var(--color-accent);
	}

	.action-btn.fork-btn.fork-active:hover:not(:disabled) {
		opacity: 0.75;
	}

	@keyframes pulse-opacity {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	.action-btn.needs-sync {
		animation: pulse-opacity 1.8s ease-in-out infinite;
		color: var(--color-accent);
	}
</style>
