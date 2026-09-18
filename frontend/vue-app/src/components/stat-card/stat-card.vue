<script lang="ts" setup>
import { IconifyIcon } from '@vben/icons';

/**
 * 统计项卡片：统一「图标 + 数值 + 标签」样式，用于 dashboard / profile 统计区。
 */
withDefaults(
  defineProps<{
    /** 数值（已格式化好的字符串或数字） */
    value: null | number | string;
    label: string;
    icon: string;
    /** 图标底色，默认主题蓝 */
    tone?: 'blue' | 'green' | 'orange' | 'purple';
  }>(),
  { tone: 'blue' },
);

const TONE_CLASS: Record<'blue' | 'green' | 'orange' | 'purple', string> = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  green: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
};
</script>

<template>
  <div class="bg-card flex items-center gap-4 rounded-lg border p-4">
    <span
      :class="TONE_CLASS[tone]"
      class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
    >
      <IconifyIcon :icon="icon" class="text-xl" />
    </span>
    <div class="min-w-0">
      <div class="truncate text-2xl font-semibold leading-7">
        {{ value ?? 0 }}
      </div>
      <div class="text-muted-foreground mt-1 text-xs">{{ label }}</div>
    </div>
  </div>
</template>
