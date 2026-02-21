<script lang="ts">
	import DocsSidebar from '$lib/components/DocsSidebar.svelte';
	import PrevNextNav from '$lib/components/PrevNextNav.svelte';
	import TableOfContents from '$lib/components/TableOfContents.svelte';

	let { children } = $props();
	let sidebarOpen = $state(false);

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}
</script>

<svelte:head>
	<meta name="color-scheme" content="dark" />
</svelte:head>

<a href="#docs-content" class="sr-only skip-link">Skip to content</a>

<header class="docs-nav">
	<div class="docs-nav-inner">
		<div class="docs-nav-left">
			<button
				class="sidebar-toggle"
				onclick={toggleSidebar}
				aria-label="Toggle sidebar navigation"
				aria-expanded={sidebarOpen}
			>
				<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
					<path
						d="M3 5h12M3 9h12M3 13h12"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
				</svg>
			</button>

			<a href="/" class="docs-logo">@cadview</a>
			<span class="docs-sep" aria-hidden="true">/</span>
			<a href="/docs" class="docs-label">docs</a>
		</div>

		<div class="docs-nav-right">
			<a
				href="https://github.com/wiscaksono/cadview"
				target="_blank"
				rel="noopener noreferrer"
				class="docs-github"
				aria-label="View on GitHub"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
					<path
						d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
					/>
				</svg>
			</a>
		</div>
	</div>
</header>

<main class="docs-layout">
	<DocsSidebar bind:open={sidebarOpen} />

	<div class="docs-content">
		<div class="docs-content-inner">
			<article class="prose" id="docs-content">
				{@render children()}
			</article>
			<PrevNextNav />
		</div>

		<aside class="docs-toc">
			<TableOfContents />
		</aside>
	</div>
</main>

<style>
	/* ─── Skip link ───────────────────────────────────────── */
	:global(.skip-link:focus) {
		position: fixed;
		top: 8px;
		left: 8px;
		z-index: 200;
		width: auto;
		height: auto;
		margin: 0;
		padding: 8px 16px;
		clip: auto;
		font-family: var(--font-mono);
		font-size: 0.82rem;
		color: var(--bg);
		background: var(--primary);
		border-radius: 4px;
	}

	/* ─── Docs Navbar ─────────────────────────────────────── */
	.docs-nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: var(--nav-h);
		background: rgba(8, 9, 13, 0.82);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-bottom: 1px solid var(--border);
		z-index: 50;
	}
	.docs-nav-inner {
		max-width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 20px;
	}
	.docs-nav-left {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.docs-logo {
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: 0.95rem;
		color: var(--text);
		text-decoration: none;
		letter-spacing: -0.02em;
	}
	.docs-logo:hover {
		color: var(--primary);
	}
	.docs-sep {
		color: var(--muted);
		font-family: var(--font-mono);
		font-size: 0.85rem;
		opacity: 0.4;
	}
	.docs-label {
		font-family: var(--font-mono);
		font-size: 0.82rem;
		color: var(--muted);
		text-decoration: none;
		transition: color 0.15s;
	}
	.docs-label:hover {
		color: var(--text);
	}
	.docs-nav-right {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.docs-github {
		color: var(--muted);
		display: flex;
		align-items: center;
		transition: color 0.15s;
	}
	.docs-github:hover {
		color: var(--text);
	}
	.docs-github:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 4px;
		border-radius: 2px;
	}
	.sidebar-toggle {
		display: none;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		color: var(--text-2);
		border-radius: 5px;
		transition:
			color 0.15s,
			background 0.15s;
	}
	.sidebar-toggle:hover {
		color: var(--text);
		background: var(--surface);
	}
	.sidebar-toggle:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}

	/* ─── Docs Layout ─────────────────────────────────────── */
	.docs-layout {
		display: flex;
		min-height: 100vh;
		padding-top: var(--nav-h);
	}
	.docs-content {
		flex: 1;
		min-width: 0;
		margin-left: 260px;
		display: flex;
	}
	.docs-content-inner {
		flex: 1;
		min-width: 0;
		max-width: 780px;
		padding: 48px 56px 80px;
	}
	.docs-toc {
		width: 220px;
		flex-shrink: 0;
		padding-top: 48px;
		padding-right: 24px;
	}

	/* ─── Responsive ──────────────────────────────────────── */
	@media (max-width: 1280px) {
		.docs-toc {
			display: none;
		}
		.docs-content-inner {
			max-width: 100%;
		}
	}
	@media (max-width: 1024px) {
		.sidebar-toggle {
			display: flex;
		}
		.docs-content {
			margin-left: 0;
		}
		.docs-content-inner {
			padding: 40px var(--gutter) 72px;
		}
	}
</style>
