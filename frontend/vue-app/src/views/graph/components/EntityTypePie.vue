<script lang="ts" setup>
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue';

import * as echarts from 'echarts';

/** 知识点类型分布环形图。 */
defineOptions({ name: 'EntityTypePie' });

const props = defineProps<{ items: Array<{ count: number; type: string }> }>();
const elRef = useTemplateRef<HTMLElement>('elRef');
let chart: echarts.ECharts | undefined;

function render() {
  if (!elRef.value) return;
  chart?.setOption({
    series: [
      {
        avoidLabelOverlap: true,
        data: props.items.length
          ? props.items.map((item) => ({ name: item.type, value: item.count }))
          : [{ name: '暂无', value: 0 }],
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: { color: '#595959', fontSize: 11 },
        radius: ['42%', '68%'],
        type: 'pie',
      },
    ],
    tooltip: { trigger: 'item' },
  });
}

onMounted(() => {
  if (!elRef.value) return;
  chart = echarts.init(elRef.value);
  render();
  new ResizeObserver(() => chart?.resize()).observe(elRef.value);
});
onBeforeUnmount(() => chart?.dispose());
watch(() => props.items, render);
</script>

<template>
  <div ref="elRef" class="h-48 w-full" />
</template>
