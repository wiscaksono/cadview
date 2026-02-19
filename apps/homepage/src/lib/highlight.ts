import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

// Custom theme matching the @cadview design system
const cadviewTheme = {
	name: 'cadview-dark',
	type: 'dark' as const,
	colors: {
		'editor.background': '#0a0b10',
		'editor.foreground': '#e1e7ef'
	},
	settings: [
		{
			scope: ['comment', 'punctuation.definition.comment'],
			settings: { foreground: '#5b6378', fontStyle: 'italic' }
		},
		{
			scope: [
				'keyword',
				'storage.type',
				'storage.modifier',
				'keyword.control',
				'keyword.operator.new',
				'keyword.operator.expression',
				'keyword.operator.logical'
			],
			settings: { foreground: '#22d3ee' }
		},
		{
			scope: ['string', 'string.quoted'],
			settings: { foreground: '#a3e635' }
		},
		{
			scope: ['constant.numeric', 'constant.language'],
			settings: { foreground: '#f97316' }
		},
		{
			scope: ['entity.name.function', 'support.function', 'meta.function-call'],
			settings: { foreground: '#c4b5fd' }
		},
		{
			scope: ['entity.name.tag', 'support.class.component', 'punctuation.definition.tag'],
			settings: { foreground: '#f472b6' }
		},
		{
			scope: ['entity.other.attribute-name'],
			settings: { foreground: '#22d3ee' }
		},
		{
			scope: ['variable', 'variable.other', 'variable.parameter'],
			settings: { foreground: '#e1e7ef' }
		},
		{
			scope: ['entity.name.type', 'support.type'],
			settings: { foreground: '#22d3ee' }
		},
		{
			scope: ['punctuation', 'meta.brace'],
			settings: { foreground: '#b0b8c8' }
		},
		{
			scope: ['keyword.operator', 'keyword.operator.assignment'],
			settings: { foreground: '#b0b8c8' }
		},
		{
			scope: ['meta.object-literal.key'],
			settings: { foreground: '#e1e7ef' }
		},
		{
			scope: ['variable.other.property'],
			settings: { foreground: '#b0b8c8' }
		},
		{
			scope: ['support.type.property-name'],
			settings: { foreground: '#b0b8c8' }
		},
		{
			scope: ['constant.other'],
			settings: { foreground: '#f97316' }
		}
	]
};

function getHighlighter(): Promise<Highlighter> {
	if (!highlighterPromise) {
		highlighterPromise = createHighlighter({
			themes: [cadviewTheme],
			langs: ['typescript', 'tsx', 'svelte', 'vue']
		});
	}
	return highlighterPromise;
}

export async function highlight(code: string, lang: string): Promise<string> {
	const highlighter = await getHighlighter();
	const html = highlighter.codeToHtml(code.trim(), {
		lang,
		theme: 'cadview-dark'
	});

	// Extract just the inner code content (strip outer <pre><code> wrappers)
	// shiki outputs: <pre class="..." style="..."><code><span>...</span></code></pre>
	const codeMatch = html.match(/<code>([\s\S]*?)<\/code>/);
	return codeMatch ? codeMatch[1] : html;
}
