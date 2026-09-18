<script lang="ts" setup>
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue';

import * as echarts from 'echarts';

import type { GraphViewEdge, GraphViewNode } from '#/api';

/** 力导向图谱：ECharts 渲染，支持缩放、导出与节点选择。 */
defineOptions({ name: 'ForceGraph' });

const props = defineProps<{ edges: GraphViewEdge[]; nodes: GraphViewNode[] }>();
const emit = defineEmits<{ select: [node: GraphViewNode] }>();

const elRef = useTemplateRef<HTMLElement>('elRef');
const chart = shallowRef<echarts.ECharts>();
let observer: ResizeObserver | undefined;

const categories = [
  { itemStyle: { color: '#1677ff' }, name: '文档' },
  { itemStyle: { color: '#52c41a' }, name: '知识点' },
  { itemStyle: { color: '#fa8c16' }, name: '人物' },
  { itemStyle: { color: '#13c2c2' }, name: '组织' },
  { itemStyle: { color: '#722ed1' }, name: '标签' },
];

function categoryIndex(node: GraphViewNode) {
  if (node.kind === 'document') return 0;
  if (node.kind === 'tag') return 4;
  if (node.type === 'PERSON') return 2;
  if (node.type === 'ORGANIZATION') return 3;
  return 1;
}

function kindLabel(node: GraphViewNode) {
  if (node.kind === 'document') return '文档';
  if (node.kind === 'tag') return '标签';
  if (node.type === 'PERSON') return '人物';
  if (node.type === 'ORGANIZATION') return '组织';
  return node.type || '知识点';
}

function edgeStyle(kind: GraphViewEdge['kind']) {
  if (kind === 'mentions') return { color: '#1677ff', curveness: 0.24, type: 'solid', width: 1.8 };
  if (kind === 'related') return { color: '#8c8c8c', curveness: 0.28, type: 'dashed', width: 1.3 };
  return { color: '#722ed1', curveness: 0.2, type: 'dashed', width: 1.3 };
}

function buildOption() {
  const degree = new Map<string, number>();
  for (const edge of props.edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  return {
    backgroundColor: 'transparent',
    series: [
      {
        categories,
        data: props.nodes.map((node) => {
          const degreeCount = degree.get(node.id) ?? 1;
          return {
            category: categoryIndex(node),
            id: node.id,
            label: { fontWeight: node.kind === 'document' ? 600 : 400, show: true },
            name: node.name,
            symbolSize: node.kind === 'document' ? 32 : node.kind === 'tag' ? 16 : 18 + Math.min(degreeCount, 8),
          };
        }),
        draggable: true,
        edgeLabel: { show: false },
        edgeSymbol: ['none', 'arrow'],
        edges: props.edges.map((edge) => ({
          lineStyle: edgeStyle(edge.kind),
          relation: edge.relation,
          source: edge.source,
          target: edge.target,
        })),
        force: { edgeLength: 70, gravity: 0.1, layoutAnimation: false, repulsion: 160 },
        labelLayout: { hideOverlap: true, moveOverlap: 'shiftY' },
        layout: 'force',
        left: 40,
        right: 40,
        roam: true,
        scaleLimit: { max: 4, min: 0.25 },
        top: 24,
        type: 'graph',
      },
    ],
    tooltip: {
      confine: true,
      formatter: (raw: any) => {
        if (raw?.dataType === 'edge') return raw.data?.relation || '关联';
        const node = props.nodes.find((item) => item.id === raw?.data?.id);
        if (!node) return raw?.data?.name ?? '';
        return `<b>${node.name}</b><div style="color:#1677ff">${kindLabel(node)}</div>${node.description ? `<div style="max-width:280px;white-space:normal">${node.description}</div>` : ''}`;
      },
      trigger: 'item',
    },
  };
}

function render() {
  const el = elRef.value;
  if (!el || el.clientWidth < 80 || el.clientHeight < 80) return;
  if (!chart.value) {
    chart.value = echarts.init(el);
    chart.value.on('click', (params) => {
      if (params.dataType !== 'node') return;
      const node = props.nodes.find((item) => item.id === String((params.data as any)?.id ?? ''));
      if (node) emit('select', node);
    });
  }
  chart.value.setOption(buildOption(), { notMerge: true });
}

function changeZoom(factor: number) {
  const current = Number((chart.value?.getOption() as any)?.series?.[0]?.zoom ?? 1);
  chart.value?.setOption({ series: [{ zoom: Math.min(4, Math.max(0.25, current * factor)) }] });
}

function zoomIn() {
  changeZoom(1.25);
}

function zoomOut() {
  changeZoom(0.8);
}

function reset() {
  chart.value?.dispatchAction({ type: 'restore' });
}

function exportPng() {
  if (!chart.value) return;
  const url = chart.value.getDataURL({ backgroundColor: '#fafafa', pixelRatio: 2, type: 'png' });
  const link = document.createElement('a');
  link.download = 'knowledge-graph.png';
  link.href = url;
  link.click();
}

watch(() => [props.nodes, props.edges], () => render());
onMounted(() => {
  render();
  observer = new ResizeObserver(() => {
    chart.value?.resize();
    render();
  });
  if (elRef.value) observer.observe(elRef.value);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  chart.value?.dispose();
});

defineExpose({ exportPng, reset, zoomIn, zoomOut });
</script>

<template>
  <div ref="elRef" class="h-full w-full" />
</template>
