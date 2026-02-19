<script lang="ts">
	import { reveal } from '$lib/actions/reveal';

	const features = [
		{
			title: 'DXF Parser',
			description:
				'Fast parser supporting 13 entity types \u2014 LINE, CIRCLE, ARC, SPLINE, POLYLINE, TEXT, and more. Handles encoding detection and malformed input gracefully.'
		},
		{
			title: 'Canvas 2D Renderer',
			description:
				'DPR-aware rendering engine with dark and light themes. ACI color table with 256 colors. Block INSERT rendering with nested block support.'
		},
		{
			title: 'Interactive Viewer',
			description:
				'Pan, zoom (mouse wheel + pinch gesture), and pointer capture. Smooth camera transforms. Configurable zoom speed and limits.'
		},
		{
			title: 'Entity Selection',
			description:
				'R-tree spatial indexing via rbush for fast hit-testing. Geometric distance calculations for precise entity picking at any zoom level.'
		},
		{
			title: 'Measurement Tool',
			description:
				'Snap-to-geometry with endpoint, midpoint, and center snap types. Real-time distance, delta, and angle readouts with visual overlay.'
		},
		{
			title: 'Framework Wrappers',
			description:
				'First-class components for React, Svelte 5, and Vue 3. Reactive props, event callbacks, and hooks/composables included.'
		}
	];
</script>

<section id="features">
	<div class="section-container">
		<div class="section-label" use:reveal>// features</div>
		<div class="features-grid">
			{#each features as feature, i}
				<div class="feature-card" use:reveal={{ index: i }}>
					<span class="feature-index">{String(i + 1).padStart(2, '0')}</span>
					<div class="feature-title">{feature.title}</div>
					<p>{feature.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.features-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1px;
		background: var(--border);
		border: 1px solid var(--border);
	}
	.feature-card {
		background: var(--surface);
		padding: 32px 28px;
		position: relative;
		transition:
			background 0.3s,
			box-shadow 0.3s;
	}
	.feature-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 0;
		height: 1px;
		background: var(--primary);
		transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.feature-card:hover {
		background: var(--surface-2);
		box-shadow: inset 0 1px 0 var(--primary);
	}
	.feature-card:hover::before {
		width: 100%;
	}
	.feature-index {
		position: absolute;
		top: 12px;
		right: 16px;
		font-family: var(--font-mono);
		font-size: 0.65rem;
		color: var(--muted);
		opacity: 0.4;
		transition:
			opacity 0.3s,
			color 0.3s;
	}
	.feature-card:hover .feature-index {
		opacity: 0.8;
		color: var(--primary-dim);
	}
	.feature-title {
		font-family: var(--font-mono);
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text);
		margin-bottom: 12px;
		letter-spacing: -0.01em;
	}
	.feature-card p {
		font-size: 0.88rem;
		color: var(--text-2);
		line-height: 1.6;
	}

	@media (min-width: 769px) and (max-width: 1024px) {
		.features-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 768px) {
		.features-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
