<script lang="ts">
	import { onMount } from 'svelte';
	import { reveal } from '$lib/actions/reveal';
	import { tabs, tabLabels, tabLangs, codeSnippets, type TabId } from '$lib/code-snippets';

	let activeTab: TabId = $state('vanilla');
	let copied = $state(false);
	let highlightedCode: Record<string, string> = $state({});
	let highlighterReady = $state(false);

	let activeTabIndex = $derived(tabs.indexOf(activeTab));

	onMount(async () => {
		try {
			const { highlight } = await import('$lib/highlight');
			const results: Record<string, string> = {};
			for (const tab of tabs) {
				results[tab] = await highlight(codeSnippets[tab], tabLangs[tab]);
			}
			highlightedCode = results;
			highlighterReady = true;
		} catch {
			// Fallback to plain text
			highlighterReady = false;
		}
	});

	async function copyCode() {
		const text = codeSnippets[activeTab] ?? '';
		try {
			await navigator.clipboard.writeText(text.trim());
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 1500);
		} catch {
			// Fallback
		}
	}

	function getLineCount(tab: TabId): number {
		const text = codeSnippets[tab] ?? '';
		return text.split('\n').length;
	}

	function escapeHtml(str: string): string {
		return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}
</script>

<section id="examples">
	<div class="section-container">
		<div class="section-label" use:reveal>// quick start</div>
		<div class="code-block" use:reveal>
			<div class="code-tabs">
				<div
					class="tab-slider"
					style="transform: translateX({activeTabIndex * 100}%); width: calc(100% / {tabs.length})"
				></div>
				{#each tabs as tab}
					<button
						class="code-tab"
						class:active={activeTab === tab}
						onclick={() => {
							activeTab = tab;
						}}
					>
						{tabLabels[tab]}
					</button>
				{/each}
			</div>
			<div class="code-content">
				<button class="code-copy" class:copied onclick={copyCode} aria-label="Copy code">
					{#if copied}
						<span class="copy-feedback">Copied!</span>
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
				<div class="code-scroll">
					<div class="line-numbers" aria-hidden="true">
						{#each { length: getLineCount(activeTab) } as _, i}
							<span>{i + 1}</span>
						{/each}
					</div>
					{#if highlighterReady && highlightedCode[activeTab]}
						<pre class="code-pre"><code>{@html highlightedCode[activeTab]}</code></pre>
					{:else}
						<pre class="code-pre"><code>{@html escapeHtml(codeSnippets[activeTab] ?? '')}</code
							></pre>
					{/if}
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.code-block {
		border: 1px solid var(--border);
		background: var(--code-bg);
		overflow: hidden;
	}
	.code-tabs {
		display: flex;
		border-bottom: 1px solid var(--border);
		position: relative;
	}
	.tab-slider {
		position: absolute;
		bottom: -1px;
		left: 0;
		height: 2px;
		background: var(--primary);
		transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
		z-index: 2;
	}
	.code-tab {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		padding: 10px 20px;
		color: var(--muted);
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		transition: color 0.15s;
		flex: 1;
		text-align: center;
	}
	.code-tab:hover {
		color: var(--text-2);
	}
	.code-tab.active {
		color: var(--primary);
	}
	.code-content {
		position: relative;
		overflow: hidden;
	}
	.code-copy {
		position: absolute;
		top: 12px;
		right: 12px;
		z-index: 5;
		color: var(--muted);
		padding: 6px;
		border: 1px solid var(--border);
		background: var(--surface);
		transition: all 0.15s;
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.code-copy:hover {
		color: var(--primary);
		border-color: var(--border-hover);
	}
	.code-copy.copied {
		color: var(--primary);
		border-color: var(--primary-dim);
	}
	.copy-feedback {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		padding: 0 2px;
	}
	.code-scroll {
		display: flex;
		overflow-x: auto;
	}
	.line-numbers {
		display: flex;
		flex-direction: column;
		padding: 24px 0;
		padding-left: 20px;
		padding-right: 12px;
		text-align: right;
		user-select: none;
		border-right: 1px solid var(--border);
		min-width: 52px;
		flex-shrink: 0;
	}
	.line-numbers span {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		line-height: calc(0.82rem * 1.7);
		color: var(--muted);
		opacity: 0.5;
	}
	.code-pre {
		padding: 24px 28px;
		overflow-x: auto;
		font-family: var(--font-mono);
		font-size: 0.82rem;
		line-height: 1.7;
		tab-size: 2;
		white-space: pre;
		flex: 1;
	}

	/* Shiki inline styles will handle colors, but we style the container */
	.code-pre :global(span) {
		font-family: var(--font-mono);
	}

	@media (max-width: 768px) {
		.code-tab {
			padding: 8px 12px;
			font-size: 0.72rem;
		}
		.line-numbers {
			display: none;
		}
	}
</style>
