export interface DocPage {
	title: string;
	href: string;
}

export interface DocSection {
	label: string;
	pages: DocPage[];
}

export const docsSections: DocSection[] = [
	{
		label: '// overview',
		pages: [
			{ title: 'Introduction', href: '/docs' },
			{ title: 'Getting Started', href: '/docs/getting-started' }
		]
	},
	{
		label: '// core api',
		pages: [
			{ title: 'CadViewer', href: '/docs/core-api' },
			{ title: 'Events', href: '/docs/core-api/events' },
			{ title: 'Types', href: '/docs/core-api/types' }
		]
	},
	{
		label: '// frameworks',
		pages: [
			{ title: 'Overview', href: '/docs/frameworks' },
			{ title: 'React', href: '/docs/frameworks/react' },
			{ title: 'Svelte', href: '/docs/frameworks/svelte' },
			{ title: 'Vue', href: '/docs/frameworks/vue' }
		]
	},
	{
		label: '// reference',
		pages: [
			{ title: 'DWG Support', href: '/docs/dwg-support' },
			{ title: 'Entities', href: '/docs/entities' },
			{ title: 'Theming', href: '/docs/theming' }
		]
	}
];

/** Flat ordered list of all doc pages (for prev/next navigation) */
export const allDocPages: DocPage[] = docsSections.flatMap((s) => s.pages);

export function getPrevNext(currentPath: string): { prev: DocPage | null; next: DocPage | null } {
	const idx = allDocPages.findIndex((p) => p.href === currentPath);
	if (idx === -1) return { prev: null, next: null };
	return {
		prev: idx > 0 ? allDocPages[idx - 1] : null,
		next: idx < allDocPages.length - 1 ? allDocPages[idx + 1] : null
	};
}
