<script lang="ts">
	const year = new Date().getFullYear();
</script>

<footer>
	<div class="footer-inner">
		<span class="footer-logo">@cadview</span>
		<span class="footer-sep">&middot;</span>
		<span>MIT License</span>
		<span class="footer-sep">&middot;</span>
		<span
			>Built by <a href="https://github.com/wiscaksono" target="_blank" rel="noopener"
				>Wisnu Wicaksono</a
			></span
		>
		<span class="footer-sep">&middot;</span>
		<span>{year}</span>
	</div>
</footer>

<style>
	footer {
		border-top: 1px solid transparent;
		border-image: linear-gradient(90deg, transparent 0%, var(--primary-dim) 50%, transparent 100%) 1;
		padding: 28px 0;
	}
	.footer-inner {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: 0 var(--gutter);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		font-family: var(--font-mono);
		font-size: 0.78rem;
		color: var(--muted);
		flex-wrap: wrap;
	}
	.footer-logo {
		color: var(--text-2);
		font-weight: 600;
	}
	.footer-sep {
		opacity: 0.3;
	}
	.footer-inner a {
		color: var(--text-2);
		transition: color 0.15s;
	}
	.footer-inner a:hover {
		color: var(--primary);
	}
</style>
