<script>
	let { title, description } = $props();
</script>

<svelte:head>
	<title>{title} — @cadview docs</title>
	<meta name="description" content={description} />
	<meta property="og:title" content="{title} — @cadview docs" />
	<meta property="og:description" content={description} />
	<meta property="og:site_name" content="@cadview" />
	<meta property="og:type" content="article" />
</svelte:head>

<slot />
