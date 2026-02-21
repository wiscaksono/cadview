<script lang="ts">
	import { onMount } from 'svelte';

	let scrollY = $state(0);
	let scrolled = $derived(scrollY > 20);
	let menuOpen = $state(false);
	let activeSection = $state('');
	let scrollProgress = $state(0);

	const navLinks = [
		{ href: '#features', label: 'Features', index: '01' },
		{ href: '#demo', label: 'Demo', index: '02' },
		{ href: '#examples', label: 'Code', index: '03' },
		{ href: '/docs', label: 'Docs', index: '04' }
	];

	function toggleMenu() {
		menuOpen = !menuOpen;
		document.body.style.overflow = menuOpen ? 'hidden' : '';
	}

	function closeMenu() {
		menuOpen = false;
		document.body.style.overflow = '';
	}

	function updateScrollProgress() {
		const docHeight = document.documentElement.scrollHeight - window.innerHeight;
		scrollProgress = docHeight > 0 ? Math.min(scrollY / docHeight, 1) : 0;
	}

	$effect(() => {
		updateScrollProgress();
	});

	onMount(() => {
		const sections = document.querySelectorAll('section[id]');
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						activeSection = entry.target.id;
					}
				}
			},
			{ threshold: 0, rootMargin: '-50% 0px -50% 0px' }
		);

		sections.forEach((section) => observer.observe(section));

		return () => observer.disconnect();
	});
</script>

<svelte:window bind:scrollY />

<nav class:scrolled>
	<div class="scroll-progress" style="transform: scaleX({scrollProgress})"></div>
	<div class="nav-inner">
		<a href="/" class="nav-logo" onclick={closeMenu}>@cadview</a>

		<!-- Desktop links -->
		<div class="nav-links">
			{#each navLinks as link}
				<a href={link.href} class:active={activeSection === link.href.slice(1)}>
					<span class="link-index">{link.index}</span>
					{link.label}
				</a>
			{/each}
			<a
				href="https://github.com/wiscaksono/cadview"
				target="_blank"
				rel="noopener"
				class="nav-github"
			>
				GitHub<svg width="12" height="12" viewBox="0 0 12 12" fill="none" class="external-icon"
					><path
						d="M3 1h8v8M11 1L1 11"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/></svg
				>
			</a>
		</div>

		<!-- Mobile hamburger -->
		<button class="hamburger" class:open={menuOpen} onclick={toggleMenu} aria-label="Toggle menu">
			<span class="hamburger-line"></span>
			<span class="hamburger-line"></span>
			<span class="hamburger-line"></span>
		</button>
	</div>
</nav>

<!-- Mobile overlay (outside nav to avoid backdrop-filter containing block) -->
{#if menuOpen}
	<div class="mobile-overlay" role="presentation" onclick={closeMenu}>
		<div class="mobile-menu" role="presentation" onclick={(e) => e.stopPropagation()}>
			<div class="mobile-menu-header">// navigation</div>
			{#each navLinks as link, i}
				<a
					href={link.href}
					class="mobile-link"
					class:active={activeSection === link.href.slice(1)}
					onclick={closeMenu}
					style="animation-delay: {i * 0.06 + 0.1}s"
				>
					<span class="mobile-link-index">[{link.index}]</span>
					<span class="mobile-link-label">{link.label}</span>
					<span class="mobile-link-arrow">→</span>
				</a>
			{/each}
			<a
				href="https://github.com/wiscaksono/cadview"
				target="_blank"
				rel="noopener"
				class="mobile-link"
				style="animation-delay: {navLinks.length * 0.06 + 0.1}s"
			>
				<span class="mobile-link-index">[04]</span>
				<span class="mobile-link-label">GitHub</span>
				<svg width="12" height="12" viewBox="0 0 12 12" fill="none" class="external-icon"
					><path
						d="M3 1h8v8M11 1L1 11"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/></svg
				>
			</a>
			<div class="mobile-menu-footer">
				<span>@cadview v0.1.0</span>
				<span class="mobile-footer-dot">·</span>
				<span>MIT License</span>
			</div>
		</div>
	</div>
{/if}

<style>
	nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		height: var(--nav-h);
		border-bottom: 1px solid transparent;
		transition:
			background 0.3s,
			border-color 0.3s,
			backdrop-filter 0.3s;
	}
	nav.scrolled {
		background: rgba(8, 9, 13, 0.82);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-bottom-color: var(--border);
	}

	/* Scroll progress bar */
	.scroll-progress {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 2px;
		background: var(--primary);
		transform-origin: left;
		transform: scaleX(0);
		z-index: 110;
		opacity: 0.7;
	}

	.nav-inner {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: 0 var(--gutter);
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	nav .nav-logo {
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: 1.05rem;
		color: var(--text);
		letter-spacing: -0.02em;
		z-index: 110;
	}

	/* Desktop nav links */
	.nav-links {
		display: flex;
		align-items: center;
		gap: 28px;
	}
	.nav-links a {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--muted);
		transition: color 0.2s;
		display: flex;
		align-items: center;
		gap: 4px;
		position: relative;
		padding-bottom: 2px;
	}
	.nav-links a::after {
		content: '';
		position: absolute;
		bottom: -2px;
		left: 0;
		width: 0;
		height: 1px;
		background: var(--primary);
		transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.nav-links a:hover::after {
		width: 100%;
	}
	.nav-links a:hover {
		color: var(--text);
	}
	.nav-links a.active {
		color: var(--primary);
	}
	.nav-links a.active::after {
		width: 100%;
	}
	.link-index {
		font-size: 0.65rem;
		opacity: 0;
		margin-right: -2px;
		transition:
			opacity 0.2s,
			margin-right 0.2s;
		color: var(--primary-dim);
	}
	.nav-links a:hover .link-index,
	.nav-links a.active .link-index {
		opacity: 1;
		margin-right: 4px;
	}
	.external-icon {
		flex-shrink: 0;
	}

	/* Hamburger button */
	.hamburger {
		display: none;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 32px;
		height: 32px;
		gap: 5px;
		z-index: 110;
		padding: 4px;
		cursor: pointer;
	}
	.hamburger-line {
		display: block;
		width: 18px;
		height: 1.5px;
		background: var(--text);
		transition:
			transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
			opacity 0.2s,
			width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
		transform-origin: center;
	}
	.hamburger.open .hamburger-line:nth-child(1) {
		transform: translateY(6.5px) rotate(45deg);
	}
	.hamburger.open .hamburger-line:nth-child(2) {
		opacity: 0;
		width: 0;
	}
	.hamburger.open .hamburger-line:nth-child(3) {
		transform: translateY(-6.5px) rotate(-45deg);
	}

	/* Mobile overlay */
	.mobile-overlay {
		position: fixed;
		inset: 0;
		top: var(--nav-h);
		background: rgba(8, 9, 13, 0.95);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
		z-index: 99;
		animation: overlayIn 0.25s ease-out;
	}
	@keyframes overlayIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.mobile-menu {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: 32px var(--gutter);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.mobile-menu-header {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--muted);
		margin-bottom: 16px;
		letter-spacing: 0.02em;
	}
	.mobile-link {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 16px 20px;
		font-family: var(--font-mono);
		font-size: 0.95rem;
		color: var(--text-2);
		border: 1px solid var(--border);
		border-bottom: none;
		background: var(--surface);
		transition:
			background 0.15s,
			color 0.15s,
			border-color 0.15s;
		animation: menuItemIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
	}
	.mobile-link:last-of-type {
		border-bottom: 1px solid var(--border);
	}
	.mobile-link:hover,
	.mobile-link.active {
		background: var(--surface-2);
		color: var(--text);
		border-color: var(--border-hover);
	}
	.mobile-link.active {
		border-left: 2px solid var(--primary);
	}
	@keyframes menuItemIn {
		from {
			opacity: 0;
			transform: translateX(-12px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
	.mobile-link-index {
		font-size: 0.72rem;
		color: var(--primary-dim);
		min-width: 28px;
	}
	.mobile-link-label {
		flex: 1;
	}
	.mobile-link-arrow {
		color: var(--muted);
		font-size: 0.85rem;
		transition:
			transform 0.2s,
			color 0.2s;
	}
	.mobile-link:hover .mobile-link-arrow {
		transform: translateX(4px);
		color: var(--primary);
	}
	.mobile-menu-footer {
		margin-top: 32px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--muted);
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.mobile-footer-dot {
		opacity: 0.3;
	}

	@media (max-width: 768px) {
		.nav-links {
			display: none;
		}
		.hamburger {
			display: flex;
		}
	}
</style>
