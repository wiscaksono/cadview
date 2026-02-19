<script lang="ts">
	import { reveal } from '$lib/actions/reveal';

	let copied = $state(false);

	async function copyInstall() {
		try {
			await navigator.clipboard.writeText('npm install @cadview/core');
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 1500);
		} catch {
			// Fallback: silent fail
		}
	}
</script>

<section id="hero">
	<!-- Background coordinate axes -->
	<div class="hero-axes" aria-hidden="true">
		<div class="axis-h"></div>
		<div class="axis-v"></div>
		<div class="axis-label axis-label-x">x</div>
		<div class="axis-label axis-label-y">y</div>
	</div>

	<div class="hero-content">
		<div class="hero-badge" use:reveal>
			v0.1.0 <span class="dot"></span> MIT License <span class="dot"></span> TypeScript
		</div>
		<h1 class="hero-title" use:reveal={{ index: 1 }}>
			<span class="hero-at">@</span>cadview
		</h1>
		<p class="hero-tagline" use:reveal={{ index: 2 }}>
			A framework-agnostic CAD/DXF<br />file viewer for the web.
		</p>
		<div class="hero-install" use:reveal={{ index: 3 }}>
			<div class="install-box">
				<span class="install-prompt">$</span>
				<span class="install-cmd">npm install @cadview/core</span>
				<button
					class="install-copy"
					class:copied
					onclick={copyInstall}
					aria-label="Copy install command"
				>
					{#if copied}
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<path
								d="M3 8.5l3 3 7-7"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					{:else}
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<rect
								x="5"
								y="5"
								width="9"
								height="9"
								rx="1.5"
								stroke="currentColor"
								stroke-width="1.2"
							/>
							<path
								d="M3 11V3a2 2 0 012-2h6"
								stroke="currentColor"
								stroke-width="1.2"
								stroke-linecap="round"
							/>
						</svg>
					{/if}
				</button>
			</div>
		</div>
		<div class="hero-actions" use:reveal={{ index: 4 }}>
			<a href="#demo" class="btn btn-primary">
				Try Live Demo
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
					<path
						d="M7 1v12M1 7l6 6 6-6"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</a>
			<a
				href="https://github.com/wiscaksono/cadview"
				target="_blank"
				rel="noopener"
				class="btn btn-ghost"
			>
				View on GitHub
				<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
					<path
						d="M3 1h8v8M11 1L1 11"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</a>
		</div>
	</div>
</section>

<style>
	#hero {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding-top: var(--nav-h);
		position: relative;
		overflow: hidden;
	}

	/* Background coordinate axes */
	.hero-axes {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
	}
	.axis-h {
		position: absolute;
		top: 55%;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			var(--border) 20%,
			var(--border) 80%,
			transparent
		);
		opacity: 0.4;
	}
	.axis-v {
		position: absolute;
		left: 50%;
		top: 0;
		bottom: 0;
		width: 1px;
		background: linear-gradient(
			180deg,
			transparent,
			var(--border) 20%,
			var(--border) 80%,
			transparent
		);
		opacity: 0.4;
	}
	.axis-label {
		position: absolute;
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: var(--muted);
		opacity: 0.3;
	}
	.axis-label-x {
		top: calc(55% - 16px);
		right: 8%;
	}
	.axis-label-y {
		left: calc(50% + 8px);
		top: 12%;
	}

	.hero-content {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: 0 var(--gutter);
		width: 100%;
		position: relative;
		z-index: 1;
		text-align: center;
	}
	.hero-badge {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--muted);
		margin-bottom: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
	}
	.dot {
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: var(--muted);
		display: inline-block;
	}
	.hero-title {
		font-family: var(--font-mono);
		font-size: clamp(3.5rem, 10vw, 7rem);
		font-weight: 700;
		line-height: 1;
		letter-spacing: -0.04em;
		margin-bottom: 20px;
		color: var(--text);
	}
	.hero-at {
		color: var(--primary);
		text-shadow:
			0 0 40px rgba(34, 211, 238, 0.3),
			0 0 80px rgba(34, 211, 238, 0.1);
		animation: atPulse 4s ease-in-out infinite;
	}
	@keyframes atPulse {
		0%,
		100% {
			text-shadow:
				0 0 40px rgba(34, 211, 238, 0.3),
				0 0 80px rgba(34, 211, 238, 0.1);
		}
		50% {
			text-shadow:
				0 0 60px rgba(34, 211, 238, 0.5),
				0 0 120px rgba(34, 211, 238, 0.15);
		}
	}
	.hero-tagline {
		font-size: clamp(1.05rem, 2.5vw, 1.35rem);
		color: var(--text-2);
		line-height: 1.5;
		max-width: 520px;
		margin-left: auto;
		margin-right: auto;
		margin-bottom: 40px;
	}
	.hero-install {
		margin-bottom: 32px;
	}
	.install-box {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		background: var(--code-bg);
		border: 1px solid var(--border);
		padding: 12px 16px;
		font-family: var(--font-mono);
		font-size: 0.9rem;
		transition:
			border-color 0.3s,
			box-shadow 0.3s;
	}
	.install-box:hover {
		border-color: var(--primary-dim);
		box-shadow:
			0 0 24px rgba(34, 211, 238, 0.08),
			inset 0 0 24px rgba(34, 211, 238, 0.02);
	}
	.install-prompt {
		color: var(--muted);
		user-select: none;
	}
	.install-cmd {
		color: var(--text);
	}
	.install-copy {
		color: var(--muted);
		padding: 4px;
		transition:
			color 0.2s,
			transform 0.2s;
		display: flex;
	}
	.install-copy:hover {
		color: var(--primary);
	}
	.install-copy.copied {
		color: var(--primary);
		transform: scale(1.1);
	}
	.hero-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		flex-wrap: wrap;
	}
	@keyframes scrollDot {
		0%,
		100% {
			top: -8px;
			opacity: 0;
		}
		20% {
			opacity: 1;
		}
		80% {
			opacity: 1;
		}
		100% {
			top: 48px;
			opacity: 0;
		}
	}

	@media (max-width: 768px) {
		.hero-title {
			font-size: clamp(2.8rem, 12vw, 5rem);
		}
		.hero-axes {
			display: none;
		}
	}
	@media (max-width: 480px) {
		.hero-actions {
			flex-direction: column;
			align-items: center;
		}
		.hero-actions :global(.btn) {
			width: 100%;
			justify-content: center;
		}
	}
</style>
