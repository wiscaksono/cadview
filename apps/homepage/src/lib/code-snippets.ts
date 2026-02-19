export const tabs = ['vanilla', 'react', 'svelte', 'vue'] as const;
export type TabId = (typeof tabs)[number];

export const tabLabels: Record<TabId, string> = {
	vanilla: 'Vanilla JS',
	react: 'React',
	svelte: 'Svelte',
	vue: 'Vue'
};

export const tabLangs: Record<TabId, string> = {
	vanilla: 'typescript',
	react: 'tsx',
	svelte: 'svelte',
	vue: 'vue'
};

export const codeSnippets: Record<TabId, string> = {
	vanilla: `import { CadViewer } from '@cadview/core';

const canvas = document.getElementById('canvas');
const viewer = new CadViewer(canvas, {
  theme: 'dark'
});

// Load from File input
const file = input.files[0];
await viewer.loadFile(file);
viewer.fitToView();

// Selection & measurement
viewer.setTool('select');
viewer.on('select', (e) => {
  console.log(e.entity.type, e.entity.layer);
});

viewer.destroy();`,

	react: `import { useState } from 'react';
import { CadViewer } from '@cadview/react';

function App() {
  const [file, setFile] = useState(null);

  return (
    <div style={{ height: '100vh' }}>
      <input
        type="file" accept=".dxf"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <CadViewer
        file={file}
        theme="dark"
        onSelect={(e) => console.log(e.entity.type)}
      />
    </div>
  );
}`,

	svelte: `<script>
  import { CadViewer } from '@cadview/svelte';

  let file = $state(null);
<\/script>

<input
  type="file" accept=".dxf"
  onchange={(e) => file = e.target.files?.[0]}
/>

<CadViewer
  {file}
  theme="dark"
  tool="pan"
  onselect={(e) => console.log(e.entity.type)}
  onmeasure={(e) => console.log(e.distance)}
/>`,

	vue: `<template>
  <input type="file" accept=".dxf" @change="onFile" />
  <CadViewer
    :file="file"
    theme="dark"
    @select="(e) => console.log(e.entity.type)"
    @measure="(e) => console.log(e.distance)"
  />
</template>

<script setup>
import { ref } from 'vue';
import { CadViewer } from '@cadview/vue';

const file = ref(null);
const onFile = (e) => file.value = e.target.files?.[0];
<\/script>`
};
