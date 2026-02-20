<script lang="ts">
	import { reveal } from '$lib/actions/reveal';

	const features = [
		{
			title: 'DXF Parser',
			description:
				"Parses 13 DXF entity types including LINE, CIRCLE, ARC, SPLINE, POLYLINE, TEXT, MTEXT, and INSERT. Handles encoding detection and won't crash on malformed input."
		},
		{
			title: 'Canvas 2D Renderer',
			description:
				'Renders to Canvas 2D with DPR scaling. Dark and light themes, full ACI 256-color table. Supports nested block INSERTs and MINSERT grids.'
		},
		{
			title: 'Interactive Viewer',
			description:
				'Pan and zoom via mouse wheel, trackpad pinch, or touch. Pointer capture keeps input working even outside the canvas. Zoom speed and min/max are configurable.'
		},
		{
			title: 'Entity Selection',
			description:
				'Uses an R-tree (rbush) for spatial indexing, so hit-testing stays fast even with thousands of entities. Picking is based on geometric distance, not bounding boxes.'
		},
		{
			title: 'Measurement Tool',
			description:
				'Snaps to endpoints, midpoints, and centers. Shows distance, delta X/Y, and angle as you measure, drawn directly on the canvas.'
		},
		{
			title: 'Framework Wrappers',
			description:
				'Drop-in components for React, Svelte 5, and Vue 3. Props are reactive, events are callbacks, and each wrapper ships a hook or composable.'
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
