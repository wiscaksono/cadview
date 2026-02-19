<script lang="ts">
	import { reveal } from '$lib/actions/reveal';

	const entities = [
		{ name: 'LINE', description: 'Line segments' },
		{ name: 'CIRCLE', description: 'Full circles' },
		{ name: 'ARC', description: 'Circular arcs' },
		{ name: 'LWPOLYLINE', description: 'Lightweight polylines with bulge arcs' },
		{ name: 'POLYLINE', description: 'Legacy polylines' },
		{ name: 'ELLIPSE', description: 'Ellipses and elliptical arcs' },
		{ name: 'SPLINE', description: 'B-splines (NURBS curves)' },
		{ name: 'TEXT', description: 'Single-line text' },
		{ name: 'MTEXT', description: 'Multi-line formatted text' },
		{ name: 'INSERT', description: 'Block references with MINSERT grid' },
		{ name: 'DIMENSION', description: 'Dimension annotations via geometry blocks' },
		{ name: 'HATCH', description: 'Hatch fills with line, arc, and circle edges' },
		{ name: 'POINT', description: 'Point markers' }
	];
</script>

<section id="entities">
	<div class="section-container">
		<div class="section-label" use:reveal>// supported entities</div>
		<div class="entities-table-wrapper" use:reveal>
			<table class="entities-table">
				<thead>
					<tr>
						<th>Entity</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					{#each entities as entity, i}
						<tr use:reveal={{ index: i, delayStep: 0.03 }}>
							<td class="entity-name">{entity.name}</td>
							<td>{entity.description}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>

<style>
	.entities-table-wrapper {
		border: 1px solid var(--border);
		overflow-x: auto;
	}
	.entities-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.88rem;
	}
	.entities-table thead {
		border-bottom: 1px solid var(--border);
	}
	.entities-table th {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--muted);
		text-align: left;
		padding: 12px 24px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.entities-table td {
		padding: 10px 24px;
		border-bottom: 1px solid var(--border);
		color: var(--text-2);
	}
	.entities-table tr:last-child td {
		border-bottom: none;
	}
	.entities-table tr {
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	.entities-table tbody tr {
		border-left: 2px solid transparent;
	}
	.entities-table tbody tr:hover {
		background: var(--surface);
		border-left-color: var(--primary);
	}
	td.entity-name {
		font-family: var(--font-mono);
		font-weight: 500;
		color: var(--primary);
		font-size: 0.82rem;
		letter-spacing: 0.02em;
	}
</style>
