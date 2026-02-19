<script lang="ts">
	let scrollY = $state(0);
	let visible = $derived(scrollY > 500);

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<svelte:window bind:scrollY />

<button class="back-to-top" class:visible onclick={scrollToTop} aria-label="Scroll to top">
	<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
		<path
			d="M7 13V1M1 7l6-6 6 6"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
</button>

<style>
	.back-to-top {
		position: fixed;
		bottom: 24px;
		right: 24px;
		z-index: 90;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--border);
		background: rgba(8, 9, 13, 0.8);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		color: var(--muted);
		cursor: pointer;
		opacity: 0;
		transform: translateY(8px);
		pointer-events: none;
		transition:
			opacity 0.3s,
			transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
			color 0.2s,
			border-color 0.2s,
			background 0.2s;
	}
	.back-to-top.visible {
		opacity: 1;
		transform: translateY(0);
		pointer-events: auto;
	}
	.back-to-top:hover {
		color: var(--primary);
		border-color: var(--primary-dim);
		background: rgba(34, 211, 238, 0.05);
	}
	.back-to-top:active {
		transform: translateY(-1px) scale(0.95);
	}
</style>
