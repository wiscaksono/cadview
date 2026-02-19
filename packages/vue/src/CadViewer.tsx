import {
  defineComponent,
  ref,
  onMounted,
  onUnmounted,
  watch,
  h,
  type PropType,
} from 'vue';
import {
  CadViewer as CoreCadViewer,
  type CadViewerOptions,
  type FormatConverter,
  type DxfLayer,
  type SelectEvent,
  type MeasureEvent,
  type ViewTransform,
  type Tool,
  type Theme,
} from '@cadview/core';

export const CadViewer = defineComponent({
  name: 'CadViewer',

  props: {
    file: {
      type: [File, ArrayBuffer, String] as PropType<File | ArrayBuffer | string | null>,
      default: null,
    },
    theme: {
      type: String as PropType<Theme>,
      default: 'dark',
    },
    tool: {
      type: String as PropType<Tool>,
      default: 'pan',
    },
    options: {
      type: Object as PropType<Omit<CadViewerOptions, 'theme' | 'initialTool'>>,
      default: () => ({}),
    },
    formatConverters: {
      type: Array as PropType<FormatConverter[]>,
      default: undefined,
    },
  },

  emits: ['select', 'measure', 'viewchange', 'layers-loaded'],

  setup(props, { emit, expose }) {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const viewerRef = ref<CoreCadViewer | null>(null);

    onMounted(() => {
      if (!canvasRef.value) return;

      const viewer = new CoreCadViewer(canvasRef.value, {
        theme: props.theme,
        initialTool: props.tool,
        formatConverters: props.formatConverters,
        ...props.options,
      });
      viewerRef.value = viewer;

      viewer.on('select', (e: SelectEvent) => emit('select', e));
      viewer.on('measure', (e: MeasureEvent) => emit('measure', e));
      viewer.on('viewchange', (vt: ViewTransform) => emit('viewchange', vt));
    });

    onUnmounted(() => {
      viewerRef.value?.destroy();
      viewerRef.value = null;
    });

    watch(
      () => props.theme,
      (newTheme) => {
        viewerRef.value?.setTheme(newTheme);
      },
    );

    watch(
      () => props.tool,
      (newTool) => {
        viewerRef.value?.setTool(newTool);
      },
    );

    let loadCancelled = false;

    watch(
      () => props.file,
      async (newFile) => {
        const viewer = viewerRef.value;
        if (!viewer || !newFile) return;
        loadCancelled = true;  // cancel any in-flight load
        loadCancelled = false;
        const wasCancelled = () => loadCancelled;

        try {
          if (newFile instanceof File) {
            await viewer.loadFile(newFile);
          } else if (newFile instanceof ArrayBuffer) {
            await viewer.loadBuffer(newFile);
          } else if (typeof newFile === 'string') {
            viewer.loadString(newFile);
          }

          if (!wasCancelled()) {
            emit('layers-loaded', viewer.getLayers() as DxfLayer[]);
          }
        } catch (err) {
          if (!wasCancelled()) {
            console.error('CadViewer: failed to load file', err);
          }
        }
      },
    );

    expose({
      getViewer: () => viewerRef.value,
      fitToView: () => viewerRef.value?.fitToView(),
      getLayers: () => viewerRef.value?.getLayers() ?? [],
      setLayerVisible: (name: string, visible: boolean) =>
        viewerRef.value?.setLayerVisible(name, visible),
    });

    return () =>
      h(
        'div',
        { style: { position: 'relative', overflow: 'hidden' } },
        [
          h('canvas', {
            ref: canvasRef,
            style: { display: 'block', width: '100%', height: '100%' },
          }),
        ],
      );
  },
});
