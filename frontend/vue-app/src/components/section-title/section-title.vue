<script lang="ts" setup>
import { IconifyIcon } from '@vben/icons';

/**
 * 卡片 / 区块标题：统一「图标 + 标题」样式，供统计卡、内容卡、列表页头部使用。
 * 图标名走 iconify（与路由菜单一致，如 lucide:file-text）。
 */
withDefaults(defineProps<{ icon?: string; title: string }>(), {});
</script>

<template>
  <div class="flex items-center gap-2">
    <span
      v-if="icon"
      class="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-md"
    >
      <IconifyIcon :icon="icon" class="text-base" />
    </span>
    <span class="text-sm font-semibold">{{ title }}</span>
    <slot></slot>
  </div>
</template>
