<script lang="ts">
	import { page } from '$app/state';
	import { getPrevNext } from '$lib/docs-nav';

	const nav = $derived(getPrevNext(page.url.pathname));
</script>

<nav class="prev-next" aria-label="Pagination">
	{#if nav.prev}
		<a href={nav.prev.href} class="pn-link pn-prev">
			<span class="pn-dir">
				<svg
					width="14"
					height="14"
					viewBox="0 0 14 14"
					fill="none"
					aria-hidden="true"
					class="pn-arrow"
				>
					<path
						d="M8.5 3L4.5 7L8.5 11"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				Previous
			</span>
			<span class="pn-title">{nav.prev.title}</span>
		</a>
	{:else}
		<div></div>
	{/if}

	{#if nav.next}
		<a href={nav.next.href} class="pn-link pn-next">
			<span class="pn-dir">
				Next
				<svg
					width="14"
					height="14"
					viewBox="0 0 14 14"
					fill="none"
					aria-hidden="true"
					class="pn-arrow"
				>
					<path
						d="M5.5 3L9.5 7L5.5 11"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</span>
			<span class="pn-title">{nav.next.title}</span>
		</a>
	{:else}
		<div></div>
	{/if}
</nav>

<style>
	.prev-next {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		margin-top: 64px;
		padding-top: 32px;
		border-top: 1px solid var(--border);
	}
	.pn-link {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 16px 20px;
		border: 1px solid var(--border);
		border-radius: 6px;
		text-decoration: none;
		transition:
			border-color 0.2s,
			background 0.2s;
	}
	.pn-link:hover {
		border-color: var(--primary-dim);
		background: var(--surface);
	}
	.pn-link:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}
	.pn-next {
		text-align: right;
		align-items: flex-end;
	}
	.pn-dir {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--muted);
		letter-spacing: 0.02em;
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.pn-next .pn-dir {
		justify-content: flex-end;
	}
	.pn-title {
		font-family: var(--font-mono);
		font-size: 0.88rem;
		font-weight: 500;
		color: var(--primary);
		transition: color 0.2s;
	}
	.pn-link:hover .pn-title {
		color: var(--text);
	}
	.pn-arrow {
		transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
		flex-shrink: 0;
	}
	.pn-prev:hover .pn-arrow {
		transform: translateX(-3px);
	}
	.pn-next:hover .pn-arrow {
		transform: translateX(3px);
	}

	@media (max-width: 480px) {
		.prev-next {
			grid-template-columns: 1fr;
		}
		.pn-next {
			text-align: left;
			align-items: flex-start;
		}
		.pn-next .pn-dir {
			justify-content: flex-start;
		}
	}
</style>
