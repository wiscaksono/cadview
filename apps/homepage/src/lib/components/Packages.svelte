<script lang="ts">
	import { reveal } from '$lib/actions/reveal';

	const wrappers = [
		{
			name: '@cadview/react',
			description: 'React 18/19 component & hook',
			npm: 'https://www.npmjs.com/package/@cadview/react'
		},
		{
			name: '@cadview/svelte',
			description: 'Svelte 5 component (runes)',
			npm: 'https://www.npmjs.com/package/@cadview/svelte'
		},
		{
			name: '@cadview/vue',
			description: 'Vue 3 component & composable',
			npm: 'https://www.npmjs.com/package/@cadview/vue'
		}
	];
</script>

<section id="packages">
	<div class="section-container">
		<div class="section-label" use:reveal>// packages</div>
		<div class="packages-graph" use:reveal>
			<div class="package-card package-core">
				<div class="package-name">@cadview/core</div>
				<p>DXF parser, Canvas 2D renderer, interactive viewer engine</p>
				<div class="package-meta">
					<span class="package-version">v0.1.0</span>
					<a
						href="https://www.npmjs.com/package/@cadview/core"
						target="_blank"
						rel="noopener"
						class="package-link">npm</a
					>
					<a
						href="https://github.com/wiscaksono/cadview/tree/main/packages/core"
						target="_blank"
						rel="noopener"
						class="package-link">docs</a
					>
				</div>
			</div>
			<div class="packages-connectors">
				<div class="connector-line connector-anim-top"></div>
				<div class="connector-branches">
					<div class="connector-branch connector-anim"></div>
					<div class="connector-branch connector-anim"></div>
					<div class="connector-branch connector-anim"></div>
				</div>
			</div>
			<div class="packages-wrappers">
				{#each wrappers as wrapper, i}
					<div class="package-card" use:reveal={{ index: i + 1 }}>
						<div class="package-name">{wrapper.name}</div>
						<p>{wrapper.description}</p>
						<div class="package-meta">
							<span class="package-version">v0.1.0</span>
							<a href={wrapper.npm} target="_blank" rel="noopener" class="package-link">npm</a>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>

<style>
	.packages-graph {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0;
	}
	.package-card {
		border: 1px solid var(--border);
		background: var(--surface);
		padding: 24px 28px;
		transition:
			border-color 0.2s,
			background 0.2s,
			transform 0.2s,
			box-shadow 0.2s;
		min-width: 200px;
	}
	.package-card:hover {
		border-color: var(--border-hover);
		background: var(--surface-2);
		transform: translateY(-2px);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
	}
	.package-core {
		max-width: 500px;
		width: 100%;
		text-align: center;
	}
	.package-core:hover {
		border-color: var(--primary-dim);
		box-shadow: 0 4px 24px rgba(34, 211, 238, 0.08);
	}
	.package-name {
		font-family: var(--font-mono);
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text);
		margin-bottom: 6px;
	}
	.package-card p {
		font-size: 0.82rem;
		color: var(--text-2);
		margin-bottom: 12px;
		line-height: 1.5;
	}
	.package-meta {
		display: flex;
		align-items: center;
		gap: 12px;
		font-family: var(--font-mono);
		font-size: 0.72rem;
	}
	.package-core .package-meta {
		justify-content: center;
	}
	.package-version {
		color: var(--muted);
	}
	.package-link {
		color: var(--primary-dim);
		transition: color 0.15s;
	}
	.package-link:hover {
		color: var(--primary);
	}

	/* Connector lines with draw animation */
	.packages-connectors {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		max-width: 700px;
	}
	.connector-line {
		width: 1px;
		height: 32px;
		background: var(--border);
	}
	.connector-anim-top {
		background: var(--primary-dim);
		animation: connectorDraw 1.5s ease-out both;
	}
	.connector-anim {
		background: linear-gradient(180deg, var(--primary-dim), var(--border));
		animation: connectorDraw 1.5s ease-out both;
	}
	@keyframes connectorDraw {
		from {
			opacity: 0;
			transform: scaleY(0);
			transform-origin: top;
		}
		to {
			opacity: 1;
			transform: scaleY(1);
			transform-origin: top;
		}
	}
	.connector-branches {
		display: flex;
		width: 100%;
		justify-content: space-between;
		position: relative;
	}
	.connector-branches::before {
		content: '';
		position: absolute;
		top: 0;
		left: calc(100% / 6);
		right: calc(100% / 6);
		height: 1px;
		background: var(--primary);
	}
	.connector-branch {
		width: 1px;
		height: 32px;
		margin: 0 auto;
	}
	.connector-branch:first-child {
		margin-left: calc(100% / 6);
		margin-right: 0;
	}
	.connector-branch:last-child {
		margin-right: calc(100% / 6);
		margin-left: 0;
	}

	.packages-wrappers {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4px;
		width: 100%;
		max-width: 700px;
	}
	.packages-wrappers .package-card {
		min-width: 0;
	}
	.packages-wrappers .package-card:hover {
		transform: translateY(-2px);
		position: relative;
		z-index: 1;
		border-color: var(--primary-dim);
		box-shadow: 0 4px 24px rgba(34, 211, 238, 0.08);
	}

	@media (max-width: 768px) {
		.packages-wrappers {
			grid-template-columns: 1fr;
		}
		.packages-connectors {
			display: none;
		}
		.package-core {
			max-width: 100%;
			margin-bottom: 1px;
			border-bottom: none;
		}
		.packages-graph {
			border: 1px solid var(--border);
			background: var(--border);
			gap: 1px;
		}
		.package-card {
			border: none;
		}
		.package-card:hover {
			transform: none;
			box-shadow: none;
		}
	}
</style>
