import type { Action } from 'svelte/action';

interface RevealParams {
	/** Stagger index for delay calculation */
	index?: number;
	/** Delay multiplier in seconds (default: 0.08) */
	delayStep?: number;
}

export const reveal: Action<HTMLElement, RevealParams | undefined> = (node, params) => {
	const index = params?.index ?? 0;
	const delayStep = params?.delayStep ?? 0.08;

	if (index > 0) {
		node.style.transitionDelay = `${index * delayStep}s`;
	}

	node.classList.add('reveal');

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					entry.target.classList.add('visible');
					observer.unobserve(entry.target);
				}
			}
		},
		{ threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
};
