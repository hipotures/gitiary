<script lang="ts">
	import { Moon, Sun, RefreshCw, CheckSquare, Square, Trash2, Pencil, GitFork } from 'lucide-svelte';
	import { theme } from '$lib/stores/theme';
	import { repoSort } from '$lib/stores/repoSort';
	import { impactDailyPageSize, type ImpactDailyPageSize } from '$lib/stores/impactPagination';
	import type { RepoSortField, SortDirection } from '$lib/domain/repoSort';
	import { modal } from '$lib/actions/modal';

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
		defaultBranch: string;
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

	// Default branch
	let defaultBranchValue = $state(data.defaultBranch);
	let isSavingDefaultBranch = $state(false);
	let defaultBranchSaveMessage = $state('');

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

	async function saveDefaultBranch() {
		isSavingDefaultBranch = true;
		defaultBranchSaveMessage = '';

		try {
			const response = await fetch('/api/settings', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ defaultBranch: defaultBranchValue })
			});

			if (!response.ok) {
				throw new Error('Save failed');
			}

			defaultBranchSaveMessage = 'Saved';
		} catch (error) {
			defaultBranchSaveMessage = 'Failed to save';
			console.error(error);
		} finally {
			isSavingDefaultBranch = false;
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
		<span class="ds-badge">v{data.version}</span>
	</div>

	<section class="ds-panel settings-section" aria-labelledby="appearance-title">
		<div class="ds-panel-head"><h2 class="ds-panel-title" id="appearance-title">Appearance</h2></div>
		<div class="ds-panel-body">

		<div class="setting-item">
			<div class="setting-info">
				<span class="setting-label" id="theme-label">Theme</span>
				<p class="setting-description">Choose how gitiary looks to you.</p>
			</div>

			<div class="ds-segmented" role="group" aria-labelledby="theme-label">
				<button type="button" aria-pressed={$theme === 'dark'} onclick={() => theme.set('dark')}>
					<Moon size={16} />
					<span>Dark</span>
				</button>

				<button type="button" aria-pressed={$theme === 'light'} onclick={() => theme.set('light')}>
					<Sun size={16} />
					<span>Light</span>
				</button>
			</div>
		</div>
		</div>
	</section>

	<!-- Repository Display Section -->
	<section class="ds-panel settings-section" aria-labelledby="repository-display-title">
		<div class="ds-panel-head"><h2 class="ds-panel-title" id="repository-display-title">Repository Display</h2></div>
		<div class="ds-panel-body">

		<div class="setting-item">
			<div class="setting-info">
				<label for="sort-field-select">Default Sort Order</label>
				<p class="setting-description">
					Choose how repositories are sorted on the main page by default.
				</p>
			</div>

			<div class="sort-options">
				<select
					id="sort-field-select"
					class="ds-select"
					bind:value={sortField}
					onchange={handleSortChange}
				>
					<option value="name">Alphabetical (Name)</option>
					<option value="firstCommitDate">First Commit Date</option>
					<option value="totalCommits">Total Commits</option>
					<option value="lastCommitDate">Last Active</option>
				</select>

				<select
					class="ds-select"
					aria-label="Sort direction"
					bind:value={sortDirection}
					onchange={handleSortChange}
				>
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
					class="ds-select"
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
		</div>
	</section>

	<!-- Author Emails Section -->
	<section class="ds-panel settings-section" aria-labelledby="fork-filtering-title">
		<div class="ds-panel-head"><h2 class="ds-panel-title" id="fork-filtering-title">Fork Filtering</h2></div>
		<div class="ds-panel-body">

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
					class="ds-textarea emails-textarea"
					bind:value={authorEmailsText}
					placeholder={"user@example.com\nuser@users.noreply.github.com"}
					rows={4}
				></textarea>
				<div class="emails-actions">
					<button
						type="button"
						class="ds-btn ds-btn-primary ds-btn-compact"
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
		</div>
	</section>

	<!-- Branch Tracking Section -->
	<section class="ds-panel settings-section" aria-labelledby="branch-tracking-title">
		<div class="ds-panel-head"><h2 class="ds-panel-title" id="branch-tracking-title">Branch Tracking</h2></div>
		<div class="ds-panel-body">

		<div class="setting-item">
			<div class="setting-info">
				<label for="default-branch">Default Branch Name</label>
				<p class="setting-description">
					Name of the default branch in your repositories (e.g. <code>main</code> or <code>master</code>).
					Repositories with more branches than just this default will show a branch indicator badge.
				</p>
			</div>
			<div class="branch-input-group">
				<div class="ds-field branch-field">
					<input
						id="default-branch"
						type="text"
						bind:value={defaultBranchValue}
						placeholder="main"
					/>
				</div>
				<div class="emails-actions">
					<button
						type="button"
						class="ds-btn ds-btn-primary ds-btn-compact"
						onclick={saveDefaultBranch}
						disabled={isSavingDefaultBranch}
					>
						{isSavingDefaultBranch ? 'Saving...' : 'Save'}
					</button>
					{#if defaultBranchSaveMessage}
						<span class="emails-save-msg" class:error={defaultBranchSaveMessage.includes('Failed')}>
							{defaultBranchSaveMessage}
						</span>
					{/if}
				</div>
			</div>
		</div>
		</div>
	</section>

	<!-- Repository Management Section -->
	<section class="ds-panel settings-section" aria-labelledby="repository-management-title">
		<div class="ds-panel-head"><h2 class="ds-panel-title" id="repository-management-title">Repository Management</h2></div>
		<div class="ds-panel-body">

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
			<button
				type="button"
				class="ds-btn ds-btn-primary sync-button"
				onclick={syncWithGitHub}
				disabled={isSyncing}
			>
				<RefreshCw size={16} class={isSyncing ? 'spinning' : ''} />
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
							class="checkbox-button ds-focus-ring"
							aria-pressed={repo.isActive}
							aria-label="Include {repo.owner}/{repo.name}"
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
								class="ds-icon-btn action-btn fork-btn"
								aria-pressed={repo.isFork}
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
									class="ds-icon-btn action-btn sync-all"
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
									class="ds-icon-btn action-btn sync-30d"
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
							type="button"
							class="ds-icon-btn action-btn"
							aria-label="Edit display name"
							onclick={(e) => {
								e.preventDefault();
								showEditDisplayName(repo.id, `${repo.owner}/${repo.name}`, repo.displayName);
							}}
							title="Edit display name"
						>
							<Pencil size={16} />
						</button>

						<button
							type="button"
							class="ds-icon-btn action-btn delete-btn"
							aria-label="Delete repository"
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
		</div>
	</section>
</div>

{#if deleteConfirmRepo}
	<dialog
		class="ds-dialog"
		aria-labelledby="delete-dialog-title"
		closedby="any"
		use:modal={cancelDelete}
	>
		<h2 class="ds-dialog-title" id="delete-dialog-title">Delete Repository</h2>
		<p>
			Are you sure you want to delete <strong>{deleteConfirmRepo.name}</strong>?
		</p>
		<p class="modal-warning">This will remove all commit data for this repository.</p>
		<div class="ds-dialog-actions">
			<button type="button" class="ds-btn" onclick={cancelDelete}>Cancel</button>
			<button type="button" class="ds-btn ds-btn-danger" onclick={confirmDelete}>Delete</button>
		</div>
	</dialog>
{/if}

{#if editingRepo}
	<dialog
		class="ds-dialog"
		aria-labelledby="edit-dialog-title"
		closedby="any"
		use:modal={cancelEditDisplayName}
	>
		<h2 class="ds-dialog-title" id="edit-dialog-title">Edit Display Name</h2>
		<p class="repo-identifier">Repository: <strong>{editingRepo.name}</strong></p>
		<p class="modal-description">
			Set a custom display name for this repository. Leave empty to use the original name.
		</p>

		<div class="ds-field display-name-field">
			<label for="displayName">Display Name</label>
			<input
				id="displayName"
				type="text"
				bind:value={editDisplayName}
				placeholder="Custom display name"
			/>
		</div>

		<div class="ds-dialog-actions">
			<button type="button" class="ds-btn" onclick={cancelEditDisplayName}>Cancel</button>
			<button type="button" class="ds-btn ds-btn-primary" onclick={saveDisplayName}>Save</button>
		</div>
	</dialog>
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

	.settings-section {
		margin-bottom: var(--space-lg);
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

	.setting-info label,
	.setting-label {
		display: block;
		font-weight: 500;
		margin-bottom: var(--space-xs);
	}

	.setting-description {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.sort-options {
		display: flex;
		gap: var(--space-sm);
	}

	.sync-message {
		font-size: 0.875rem;
		margin-top: var(--space-xs);
		color: var(--color-success);
	}

	.sync-message.error {
		color: var(--color-danger);
	}

	.sync-button {
		flex-shrink: 0;
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

	.repo-item.inactive {
		opacity: 0.6;
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

	.action-btn :global(.spinning) {
		animation: spin 1s linear infinite;
	}

	.modal-warning {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		margin-bottom: var(--space-lg) !important;
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

	.setting-item-column {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-md);
	}

	.emails-input-group {
		width: 100%;
	}

	.emails-actions {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin-top: var(--space-sm);
	}

	.emails-save-msg {
		font-size: 0.875rem;
		color: var(--color-success);
	}

	.emails-save-msg.error {
		color: var(--color-danger);
	}

	@keyframes pulse-opacity {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	.branch-field {
		margin-bottom: 0;
	}

	/* On narrow screens the controls wrap below their description, so nothing sticks out of the (clipping) panel. */
	@media (max-width: 640px) {
		.setting-item,
		.sort-options {
			flex-wrap: wrap;
		}

		.setting-info {
			flex-basis: 100%;
		}

		/* Repository rows: name on the first line, actions below it. */
		.repo-item {
			flex-wrap: wrap;
		}

		.repo-info {
			flex-basis: calc(100% - 40px);
		}
	}

	.branch-input-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		min-width: 200px;
	}

	/* Repository rows: application layout on the shared tokens. */
	.repos-scroll {
		max-height: 400px;
		overflow-y: auto;
		border: 1px solid var(--line);
		border-radius: var(--ds-radius-md);
	}

	.repo-item {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		border-bottom: 1px solid var(--line);
		cursor: pointer;
		transition: background var(--ds-duration-fast) var(--ds-ease);
	}

	.repo-item:last-child {
		border-bottom: none;
	}

	.repo-item:hover {
		background: var(--panel-2);
	}

	.checkbox-button {
		display: grid;
		place-items: center;
		background: none;
		border: none;
		border-radius: var(--ds-radius-xs);
		padding: 0;
		cursor: pointer;
		color: var(--text-dim);
		transition: color var(--ds-duration-fast) var(--ds-ease);
	}

	.checkbox-button:hover,
	.checkbox-button[aria-pressed='true'] {
		color: var(--accent);
	}

	/* Icon actions use the shared icon button at the row's compact size. */
	.repo-actions .ds-icon-btn,
	.repo-item > .ds-icon-btn {
		width: 32px;
		height: 32px;
		flex: none;
	}

	.delete-btn:hover:not(:disabled) {
		color: var(--red);
		border-color: color-mix(in srgb, var(--red) 55%, var(--line));
	}

	/* Fork marker: a toggle; the pressed state is Gitiary's own. */
	.fork-btn[aria-pressed='false'] {
		color: var(--text-dim);
	}

	.fork-btn[aria-pressed='true'] {
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 60%, var(--line));
		background: var(--accent-soft);
	}

	.action-btn :global(.spinning) {
		animation: spin 1s linear infinite;
	}

	.action-btn.needs-sync {
		animation: pulse-opacity 1.8s ease-in-out infinite;
		color: var(--accent);
	}

	.emails-textarea {
		font-family: var(--font-mono);
	}

	.ds-dialog p {
		margin-bottom: var(--space-sm);
	}

	.ds-dialog strong {
		color: var(--accent);
	}

	.display-name-field {
		margin: var(--space-md) 0 0;
	}

</style>
