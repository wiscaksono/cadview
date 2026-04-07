import { codeSnippets, tabLangs, tabs, type TabId } from '$lib/code-snippets';
import { highlight } from '$lib/highlight.server';

export const load = async () => {
	const highlightedCode = {} as Record<TabId, string>;

	await Promise.all(
		tabs.map(async (tab) => {
			highlightedCode[tab] = await highlight(codeSnippets[tab], tabLangs[tab]);
		})
	);

	console.log(highlightedCode)

	return { highlightedCode };
};
