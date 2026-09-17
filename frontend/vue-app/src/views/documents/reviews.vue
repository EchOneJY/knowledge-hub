<script lang="ts" setup>
import { Fallback } from '@vben/common-ui';

/**
 * 审核工作台：阶段二实现（对照 React 端 ReviewsPage.tsx），
 * 阶段一先以 404 占位保证路由可注册、构建可通过。
 */
defineOptions({ name: 'DocumentReviews' });
</script>

<template>
  <Fallback status="404" description="审核工作台将在阶段二实现" />
</template>
