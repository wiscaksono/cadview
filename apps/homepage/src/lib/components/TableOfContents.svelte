<script lang="ts">
	import { tick } from 'svelte';
	import { page } from '$app/state';

	interface TocItem {
		id: string;
		text: string;
		level: number;
	}

	let items = $state<TocItem[]>([]);
	let activeId = $state('');

	$effect(() => {
		// Track pathname so this re-runs on every page navigation
		const _pathname = page.url.pathname;

		let observer: IntersectionObserver | undefined;
		let cancelled = false;

		(async () => {
			// Wait for the new page content to render into the DOM
			await tick();

			if (cancelled) return;

			// Extract headings from the prose content
			const headings = document.querySelectorAll('.prose h2[id], .prose h3[id]');
			items = Array.from(headings).map((el) => ({
				id: el.id,
				text: el.textContent?.replace(/^#\s*/, '') || '',
				level: el.tagName === 'H2' ? 2 : 3
			}));

			if (items.length === 0) return;

			// Reset active heading
			activeId = '';

			// Scroll spy via IntersectionObserver
			observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting) {
							activeId = entry.target.id;
						}
					}
				},
				{ rootMargin: '-80px 0px -70% 0px', threshold: 0 }
			);

			for (const h of headings) {
				observer.observe(h);
			}
		})();

		return () => {
			cancelled = true;
			observer?.disconnect();
		};
	});
</script>

{#if items.length > 1}
	<nav class="toc" aria-label="Table of contents">
		<div class="toc-label">// on this page</div>
		<ul role="list">
			{#each items as item}
				<li class:indent={item.level === 3}>
					<a
						href="#{item.id}"
						class="toc-link"
						class:active={activeId === item.id}
						aria-current={activeId === item.id ? 'location' : undefined}
					>
						{item.text}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

<style>
	.toc {
		position: sticky;
		top: calc(var(--nav-h) + 32px);
		max-height: calc(100vh - var(--nav-h) - 64px);
		overflow-y: auto;
		padding-left: 24px;
		border-left: 1px solid var(--border);
	}
	.toc-label {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--muted);
		letter-spacing: 0.03em;
		margin-bottom: 12px;
	}
	ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	li {
		margin-bottom: 2px;
	}
	li.indent {
		padding-left: 14px;
	}
	.toc-link {
		font-family: var(--font-mono);
		font-size: 0.73rem;
		color: var(--muted);
		text-decoration: none;
		display: block;
		padding: 3px 0;
		line-height: 1.4;
		transition: color 0.15s;
	}
	.toc-link:hover {
		color: var(--text);
	}
	.toc-link.active {
		color: var(--primary);
	}
	.toc-link:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
		border-radius: 2px;
	}

	@media (max-width: 1280px) {
		.toc {
			display: none;
		}
	}
</style>
