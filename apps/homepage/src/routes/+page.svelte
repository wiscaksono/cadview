<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import Hero from '$lib/components/Hero.svelte';
	import Features from '$lib/components/Features.svelte';
	import Demo from '$lib/components/Demo.svelte';
	import CodeExamples from '$lib/components/CodeExamples.svelte';
	import Entities from '$lib/components/Entities.svelte';
	import Packages from '$lib/components/Packages.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import BackToTop from '$lib/components/BackToTop.svelte';
</script>

<svelte:head>
	<title>@cadview — Framework-agnostic CAD/DXF viewer for the web</title>
	<meta
		name="description"
		content="A framework-agnostic CAD/DXF file viewer for the web. Fast DXF parser, Canvas 2D renderer, interactive viewer with selection and measurement. Works with React, Svelte 5, and Vue 3."
	/>

	<!-- Open Graph -->
	<meta property="og:title" content="@cadview — CAD/DXF viewer for the web" />
	<meta
		property="og:description"
		content="Framework-agnostic CAD/DXF file viewer with React, Svelte, and Vue wrappers."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://cadview.wiscaksono.com" />
	<meta property="og:site_name" content="@cadview" />
	<meta property="og:image" content="https://cadview.wiscaksono.com/og.svg" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="@cadview — CAD/DXF viewer for the web" />
	<meta
		name="twitter:description"
		content="Framework-agnostic CAD/DXF file viewer with React, Svelte, and Vue wrappers."
	/>
	<meta name="twitter:image" content="https://cadview.wiscaksono.com/og.svg" />

	<!-- Additional SEO -->
	<meta
		name="keywords"
		content="CAD, DXF, viewer, web, JavaScript, TypeScript, React, Svelte, Vue, canvas, parser, renderer"
	/>
	<meta name="author" content="Wisnu Wicaksono" />
	<link rel="canonical" href="https://cadview.wiscaksono.com" />
</svelte:head>

<Nav />
<Hero />
<Features />
<Demo />
<CodeExamples />
<Entities />
<Packages />
<Footer />
<BackToTop />
