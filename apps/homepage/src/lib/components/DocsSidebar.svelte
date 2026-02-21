<script lang="ts">
	import { page } from '$app/state';
	import { docsSections } from '$lib/docs-nav';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	function closeSidebar() {
		open = false;
		document.body.style.overflow = '';
	}

	$effect(() => {
		if (open) {
			document.body.style.overflow = 'hidden';
		}
		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if open}
	<div
		class="sidebar-overlay"
		onclick={closeSidebar}
		onkeydown={(e) => e.key === 'Escape' && closeSidebar()}
		role="presentation"
	></div>
{/if}

<aside class="sidebar" class:open aria-label="Documentation navigation">
	<nav>
		{#each docsSections as section, si}
			<div class="nav-section" style="animation-delay: {si * 0.05}s">
				<div class="nav-section-label">{section.label}</div>
				<ul role="list">
					{#each section.pages as item}
						{@const isActive = page.url.pathname === item.href}
						<li>
							<a
								href={item.href}
								class="nav-link"
								class:active={isActive}
								aria-current={isActive ? 'page' : undefined}
								onclick={closeSidebar}
							>
								<span class="nav-link-indicator" aria-hidden="true"></span>
								{item.title}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</nav>

	<div class="sidebar-footer">
		<span class="sidebar-version">v0.5.0</span>
		<span class="sidebar-dot" aria-hidden="true">&middot;</span>
		<a href="https://github.com/wiscaksono/cadview" target="_blank" rel="noopener noreferrer"
			>GitHub</a
		>
		<span class="sidebar-dot" aria-hidden="true">&middot;</span>
		<a href="https://www.npmjs.com/package/@cadview/core" target="_blank" rel="noopener noreferrer"
			>npm</a
		>
	</div>
</aside>

<style>
	.sidebar-overlay {
		display: none;
	}
	.sidebar {
		position: fixed;
		top: var(--nav-h);
		left: 0;
		bottom: 0;
		width: 260px;
		background: var(--bg);
		border-right: 1px solid var(--border);
		overflow-y: auto;
		overflow-x: hidden;
		overscroll-behavior: contain;
		padding: 28px 0 0 0;
		z-index: 40;
		display: flex;
		flex-direction: column;
	}
	nav {
		flex: 1;
		padding: 0 16px;
	}
	.nav-section {
		margin-bottom: 24px;
	}
	.nav-section-label {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--muted);
		letter-spacing: 0.03em;
		padding: 0 12px;
		margin-bottom: 6px;
	}
	ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.nav-link {
		display: flex;
		align-items: center;
		gap: 10px;
		font-family: var(--font-mono);
		font-size: 0.82rem;
		color: var(--text-2);
		padding: 7px 12px;
		border-radius: 5px;
		text-decoration: none;
		transition:
			color 0.15s,
			background 0.15s;
		position: relative;
	}
	.nav-link:hover {
		color: var(--text);
		background: var(--surface);
	}
	.nav-link.active {
		color: var(--primary);
		background: rgba(34, 211, 238, 0.06);
	}
	.nav-link:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: -2px;
		border-radius: 5px;
	}

	/* Active indicator line */
	.nav-link-indicator {
		width: 3px;
		height: 0;
		border-radius: 2px;
		background: var(--primary);
		transition: height 0.2s cubic-bezier(0.16, 1, 0.3, 1);
		flex-shrink: 0;
	}
	.nav-link.active .nav-link-indicator {
		height: 16px;
	}

	.sidebar-footer {
		padding: 16px 28px;
		border-top: 1px solid var(--border);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--muted);
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
	}
	.sidebar-footer a {
		color: var(--muted);
		text-decoration: none;
		transition: color 0.15s;
	}
	.sidebar-footer a:hover {
		color: var(--primary);
	}
	.sidebar-footer a:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
		border-radius: 2px;
	}
	.sidebar-version {
		font-weight: 500;
	}
	.sidebar-dot {
		opacity: 0.3;
	}

	/* Mobile */
	@media (max-width: 1024px) {
		.sidebar-overlay {
			display: block;
			position: fixed;
			inset: 0;
			top: var(--nav-h);
			background: rgba(8, 9, 13, 0.7);
			backdrop-filter: blur(4px);
			-webkit-backdrop-filter: blur(4px);
			z-index: 39;
			animation: fadeIn 0.2s ease-out;
		}
		.sidebar {
			transform: translateX(-100%);
			transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
			z-index: 41;
			border-right-color: var(--border);
			background: rgba(8, 9, 13, 0.97);
			backdrop-filter: blur(20px);
			-webkit-backdrop-filter: blur(20px);
		}
		.sidebar.open {
			transform: translateX(0);
		}
	}
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
