<script lang="ts">
	import { onMount } from 'svelte';
	import { reveal } from '$lib/actions/reveal';
	import type { Tool, Theme, FormatConverter } from '@cadview/core';
	import type { CadViewer as CadViewerInstance } from '@cadview/svelte';

	let mounted = $state(false);
	let CadViewerComponent: typeof import('@cadview/svelte').CadViewer | null = $state(null);
	let loadError: string | null = $state(null);

	let currentTheme: Theme = $state('dark');
	let activeTool: Tool = $state('pan');
	let fileLoaded = $state(false);
	let statusText = $state('No file loaded');
	let statusCoords = $state('');
	let showDrop = $state(false);
	let dragCounter = 0;

	let cadViewerRef: CadViewerInstance | null = $state(null);
	let file: File | ArrayBuffer | null = $state(null);

	let formatConverters: FormatConverter[] = $state([]);
	let fileInputEl: HTMLInputElement | undefined = $state(undefined);

	const tools: { id: Tool; label: string }[] = [
		{ id: 'pan', label: 'Pan' },
		{ id: 'select', label: 'Select' },
		{ id: 'measure', label: 'Measure' }
	];

	let toolIndex = $derived(tools.findIndex((t) => t.id === activeTool));

	onMount(async () => {
		// Import viewer and DWG converter in parallel.
		// Both are lazy-loaded to avoid WASM/SSR resolution issues.
		// formatConverters MUST be set before mounted=true, because the
		// Svelte CadViewer wrapper captures them with untrack() at creation.
		const [svelteResult, dwgResult] = await Promise.allSettled([
			import('@cadview/svelte'),
			import('@cadview/dwg')
		]);

		// Register DWG converter first (before viewer renders)
		if (dwgResult.status === 'fulfilled') {
			formatConverters = [dwgResult.value.dwgConverter];
		}

		// Then mount the viewer component
		if (svelteResult.status === 'fulfilled') {
			CadViewerComponent = svelteResult.value.CadViewer;
			mounted = true;
		} else {
			const err = svelteResult.reason;
			loadError = err instanceof Error ? err.message : 'Failed to load viewer module';
		}
	});

	function retryLoad() {
		loadError = null;
		import('@cadview/svelte')
			.then((mod) => {
				CadViewerComponent = mod.CadViewer;
				mounted = true;
			})
			.catch((err) => {
				loadError = err instanceof Error ? err.message : 'Failed to load viewer module';
			});
	}

	function onFileLoaded(name: string) {
		if (!cadViewerRef) return;
		const viewer = cadViewerRef.getViewer();
		if (!viewer) return;
		const doc = viewer.getDocument();
		const entityCount = doc?.entities.length ?? 0;
		const layerCount = viewer.getLayers().length;
		statusText = `${name} \u2014 ${entityCount} entities, ${layerCount} layers`;
		fileLoaded = true;
		cadViewerRef.fitToView();
	}

	async function loadSample() {
		statusText = 'Loading sample...';
		try {
			const resp = await fetch('/sample.dxf');
			const buffer = await resp.arrayBuffer();
			file = buffer;
		} catch (err) {
			statusText = `Error: ${err instanceof Error ? err.message : String(err)}`;
		}
	}

	function handleFileInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const f = target.files?.[0];
		if (!f) return;
		statusText = `Loading ${f.name}...`;
		file = f;
	}

	function toggleTheme() {
		currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
	}

	function setTool(tool: Tool) {
		activeTool = tool;
	}

	function onDragEnter(e: DragEvent) {
		e.preventDefault();
		dragCounter++;
		showDrop = true;
	}

	function onDragLeave(e: DragEvent) {
		e.preventDefault();
		dragCounter--;
		if (dragCounter <= 0) {
			dragCounter = 0;
			showDrop = false;
		}
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
	}

	const ACCEPTED_EXTENSIONS = ['.dxf', '.dwg'];

	function isAcceptedFile(name: string): boolean {
		const lower = name.toLowerCase();
		return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
	}

	async function onDrop(e: DragEvent) {
		e.preventDefault();
		dragCounter = 0;
		showDrop = false;

		const f = e.dataTransfer?.files[0];
		if (!f || !isAcceptedFile(f.name)) {
			statusText = 'Please drop a .dxf or .dwg file';
			return;
		}

		statusText = `Loading ${f.name}...`;
		file = f;
	}
</script>

<section id="demo">
	<div class="section-container">
		<div class="section-label" use:reveal>// live demo</div>
		<div class="demo-wrapper" use:reveal>
			<div class="demo-toolbar">
				<div class="demo-toolbar-left">
					<button class="demo-btn" onclick={loadSample} disabled={!mounted || !!loadError}
						>Load Sample</button
					>
					<label class="demo-btn demo-file-label" class:disabled={!mounted || !!loadError}>
						Open File
						<input
							type="file"
							accept=".dxf,.dwg"
							hidden
							bind:this={fileInputEl}
							onchange={handleFileInput}
							disabled={!mounted || !!loadError}
						/>
					</label>
				</div>
				<div class="demo-toolbar-right">
					<button
						class="demo-btn demo-btn-icon"
						onclick={toggleTheme}
						aria-label="Toggle theme"
						disabled={!mounted || !!loadError}
					>
						{#if currentTheme === 'dark'}
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none"
								><circle cx="8" cy="8" r="3.5" stroke="currentColor" stroke-width="1.2" /><path
									d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
									stroke="currentColor"
									stroke-width="1.2"
									stroke-linecap="round"
								/></svg
							>
						{:else}
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none"
								><path
									d="M13.5 8.5a5.5 5.5 0 01-6-6 5.5 5.5 0 106 6z"
									stroke="currentColor"
									stroke-width="1.2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/></svg
							>
						{/if}
					</button>
					<div class="demo-tool-group">
						{#each tools as tool}
							<button
								class="demo-btn demo-tool"
								class:active={activeTool === tool.id}
								onclick={() => setTool(tool.id)}
								disabled={!mounted || !!loadError}>{tool.label}</button
							>
						{/each}
					</div>
				</div>
			</div>

			<div
				class="demo-canvas-area"
				class:file-loaded={fileLoaded}
				data-tool={activeTool}
				role="presentation"
				ondragenter={onDragEnter}
				ondragleave={onDragLeave}
				ondragover={onDragOver}
				ondrop={onDrop}
			>
				<!-- Loaded viewer -->
				{#if mounted && CadViewerComponent}
					<CadViewerComponent
						bind:this={cadViewerRef}
						{file}
						theme={currentTheme}
						tool={activeTool}
						{formatConverters}
						class="demo-cadviewer"
						onselect={(e) => {
							statusText = `Selected: ${e.entity.type} (layer: ${e.entity.layer})`;
						}}
						onmeasure={(e) => {
							statusText = `Distance: ${e.distance.toFixed(2)} | \u0394X: ${e.deltaX.toFixed(2)} | \u0394Y: ${e.deltaY.toFixed(2)} | ${e.angle.toFixed(1)}\u00b0`;
						}}
						onviewchange={(vt) => {
							statusCoords = `zoom: ${vt.scale.toFixed(2)}`;
						}}
						onlayersloaded={() => {
							if (file instanceof File) {
								onFileLoaded(file.name);
							} else {
								onFileLoaded('sample.dxf');
							}
						}}
					/>
				{/if}

				<!-- Loading state -->
				{#if !mounted && !loadError}
					<div class="demo-loading">
						<div class="loading-grid">
							<div class="loading-crosshair">
								<div class="crosshair-h"></div>
								<div class="crosshair-v"></div>
							</div>
							<div class="loading-scanline"></div>
						</div>
						<div class="loading-text">
							// initializing viewer<span class="loading-cursor">_</span>
						</div>
					</div>
				{/if}

				<!-- Error state -->
				{#if loadError}
					<div class="demo-error">
						<div class="error-icon">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
								<path
									d="M12 9v4M12 17h.01"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
								/>
								<path
									d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</div>
						<div class="error-label">// error: module load failed</div>
						<div class="error-message">{loadError}</div>
						<button class="btn btn-ghost error-retry" onclick={retryLoad}>Retry</button>
					</div>
				{/if}

				<!-- Drop overlay -->
				<div class="demo-drop-overlay" class:visible={showDrop}>
					<div class="demo-drop-content">
						<svg width="40" height="40" viewBox="0 0 40 40" fill="none"
							><path
								d="M20 5v30M5 20h30"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/></svg
						>
						<span>Drop .dxf or .dwg file</span>
					</div>
				</div>

				<!-- Empty state -->
				{#if mounted && !fileLoaded && !loadError}
					<div class="demo-empty-state">
						<p>Click <strong>Load Sample</strong> or drag &amp; drop a .dxf / .dwg file</p>
					</div>
				{/if}
			</div>

			<div class="demo-status-bar">
				<span>{statusText}<span class="status-cursor">█</span></span>
				<span>{statusCoords}</span>
			</div>
		</div>
	</div>
</section>

<style>
	#demo {
		background: var(--bg-elevated);
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
	}
	.demo-wrapper {
		border: 1px solid var(--border);
		background: var(--surface);
		overflow: hidden;
	}
	.demo-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		border-bottom: 1px solid var(--border);
		gap: 8px;
		flex-wrap: wrap;
	}
	.demo-toolbar-left,
	.demo-toolbar-right {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.demo-toolbar-left .demo-btn {
		flex: 1;
		text-align: center;
	}
	.demo-btn {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		padding: 6px 12px;
		border: 1px solid var(--border);
		background: var(--surface-2);
		color: var(--text-2);
		transition: all 0.15s;
		cursor: pointer;
		white-space: nowrap;
		line-height: 1;
		box-sizing: border-box;
		height: 30px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	.demo-btn:hover:not(:disabled) {
		border-color: var(--border-hover);
		color: var(--text);
	}
	.demo-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.demo-btn.active {
		border-color: var(--primary-dim);
		color: var(--primary);
		background: var(--primary-glow);
	}
	.demo-btn-icon {
		padding: 6px 8px;
		display: flex;
		align-items: center;
	}
	.demo-file-label {
		display: inline-flex;
		align-items: center;
	}
	.demo-file-label.disabled {
		opacity: 0.4;
		pointer-events: none;
	}

	/* Tool group */
	.demo-tool-group {
		display: flex;
		border: 1px solid var(--border);
	}
	.demo-tool-group .demo-btn.demo-tool {
		background: transparent;
		border: none;
		border-right: 1px solid var(--border);
		flex: 1;
		text-align: center;
		transition:
			background 0.15s,
			color 0.15s;
	}
	.demo-tool-group .demo-btn.demo-tool:last-child {
		border-right: none;
	}
	.demo-tool-group .demo-btn.demo-tool:hover:not(:disabled) {
		border: none;
		border-right: 1px solid var(--border);
		background: var(--surface-2);
		color: var(--text);
	}
	.demo-tool-group .demo-btn.demo-tool:hover:not(:disabled):last-child {
		border-right: none;
	}
	.demo-tool-group .demo-btn.demo-tool.active {
		color: var(--primary);
		background: var(--primary-glow);
		border: none;
		box-shadow: inset 0 0 0 1px var(--primary-dim);
	}

	/* Canvas area */
	.demo-canvas-area {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		background: var(--bg);
		overflow: hidden;
		transition: box-shadow 0.5s;
	}
	.demo-canvas-area.file-loaded {
		box-shadow: inset 0 0 40px rgba(34, 211, 238, 0.03);
	}
	.demo-canvas-area :global(.demo-cadviewer) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.demo-canvas-area :global(.demo-cadviewer canvas) {
		cursor: grab;
	}
	.demo-canvas-area :global(.demo-cadviewer canvas:active) {
		cursor: grabbing;
	}
	.demo-canvas-area[data-tool='select'] :global(.demo-cadviewer canvas) {
		cursor: crosshair;
	}
	.demo-canvas-area[data-tool='measure'] :global(.demo-cadviewer canvas) {
		cursor: crosshair;
	}

	/* Loading state — scanner animation */
	.demo-loading {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		z-index: 5;
	}
	.loading-grid {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}
	.loading-crosshair {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}
	.crosshair-h {
		width: 60px;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--primary-dim), transparent);
		opacity: 0.5;
	}
	.crosshair-v {
		width: 1px;
		height: 60px;
		background: linear-gradient(180deg, transparent, var(--primary-dim), transparent);
		opacity: 0.5;
		position: absolute;
		top: -30px;
		left: 50%;
		transform: translateX(-50%);
	}
	.loading-scanline {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(
			90deg,
			transparent 0%,
			var(--primary) 40%,
			var(--primary) 60%,
			transparent 100%
		);
		opacity: 0.6;
		animation: scanDown 2.5s ease-in-out infinite;
		box-shadow:
			0 0 20px var(--primary),
			0 0 60px rgba(34, 211, 238, 0.15);
	}
	@keyframes scanDown {
		0% {
			top: -2px;
			opacity: 0;
		}
		10% {
			opacity: 0.6;
		}
		90% {
			opacity: 0.6;
		}
		100% {
			top: 100%;
			opacity: 0;
		}
	}
	.loading-text {
		position: relative;
		z-index: 2;
		font-family: var(--font-mono);
		font-size: 0.78rem;
		color: var(--muted);
		letter-spacing: 0.02em;
	}
	.loading-cursor {
		animation: blink 1s step-end infinite;
		color: var(--primary-dim);
	}
	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
	}

	/* Error state */
	.demo-error {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		z-index: 5;
		border: 1px solid var(--accent);
		margin: 12px;
		background: rgba(249, 115, 22, 0.03);
	}
	.error-icon {
		color: var(--accent);
	}
	.error-label {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--accent);
		letter-spacing: 0.02em;
	}
	.error-message {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--muted);
		max-width: 400px;
		text-align: center;
	}
	.error-retry {
		margin-top: 8px;
		font-size: 0.78rem;
		border-color: var(--accent);
		color: var(--accent);
	}
	.error-retry:hover {
		background: rgba(249, 115, 22, 0.08);
		color: var(--text);
	}

	/* Drop overlay */
	.demo-drop-overlay {
		position: absolute;
		inset: 0;
		background: rgba(8, 9, 13, 0.85);
		backdrop-filter: blur(4px);
		display: none;
		align-items: center;
		justify-content: center;
		z-index: 10;
		border: 2px dashed var(--primary);
		margin: 8px;
	}
	.demo-drop-overlay.visible {
		display: flex;
	}
	.demo-drop-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		color: var(--primary);
		font-family: var(--font-mono);
		font-size: 0.9rem;
	}

	/* Empty state */
	.demo-empty-state {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		z-index: 5;
	}
	.demo-empty-state p {
		font-family: var(--font-mono);
		font-size: 0.85rem;
		color: var(--muted);
		text-align: center;
	}
	.demo-empty-state strong {
		color: var(--text-2);
	}

	/* Status bar */
	.demo-status-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 12px;
		border-top: 1px solid var(--border);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--muted);
	}
	.status-cursor {
		animation: blink 1.2s step-end infinite;
		color: var(--primary-dim);
		margin-left: 2px;
		font-size: 0.6rem;
	}

	@media (max-width: 768px) {
		.demo-canvas-area {
			aspect-ratio: 4 / 3;
		}
	}
	@media (max-width: 480px) {
		.demo-toolbar {
			flex-direction: column;
			align-items: stretch;
		}
		.demo-toolbar-left,
		.demo-toolbar-right {
			justify-content: space-between;
		}
	}
</style>
