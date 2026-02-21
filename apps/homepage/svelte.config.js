import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import adapter from '@sveltejs/adapter-vercel';
import { mdsvex } from 'mdsvex';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { createHighlighter } from 'shiki';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Lazy singleton highlighter matching the @cadview design system
let highlighterInstance = null;

async function getHighlighter() {
	if (!highlighterInstance) {
		highlighterInstance = await createHighlighter({
			themes: [
				{
					name: 'cadview-dark',
					type: 'dark',
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
				}
			],
			langs: ['typescript', 'tsx', 'svelte', 'vue', 'bash', 'html', 'css', 'json']
		});
	}
	return highlighterInstance;
}

/** @type {import('mdsvex').MdsvexOptions} */
const mdsvexOptions = {
	extensions: ['.md'],
	layout: join(__dirname, 'src/lib/layouts/docs.svelte'),
	highlight: {
		highlighter: async (code, lang) => {
			const hl = await getHighlighter();
			const validLang = hl.getLoadedLanguages().includes(lang) ? lang : 'text';
			const html = hl.codeToHtml(code.trim(), {
				lang: validLang,
				theme: 'cadview-dark'
			});
			// Escape Svelte special chars + backticks for safe {@html} embedding
			const escaped = html
				.replace(/{/g, '&#123;')
				.replace(/}/g, '&#125;')
				.replace(/`/g, '&#96;')
				.replace(/\$/g, '&#36;');
			return `{@html \`${escaped}\`}`;
		}
	},
	rehypePlugins: [
		rehypeSlug,
		[
			rehypeAutolinkHeadings,
			{
				behavior: 'wrap',
				properties: {
					className: ['heading-anchor']
				}
			}
		]
	]
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [mdsvex(mdsvexOptions)],
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			precompress: false,
			strict: true
		})
	}
};

export default config;
