<script lang="ts" setup>
import { computed } from 'vue';

import { ElTag } from 'element-plus';

import { DOC_STATUS } from '#/utils';

/** 文档状态标签（草稿/已发布/已归档/待审核） */
const props = defineProps<{ status: number }>();

const meta = computed(() => DOC_STATUS[props.status]);
</script>

<template>
  <ElTag v-if="meta" :type="meta.type">{{ meta.label }}</ElTag>
  <ElTag v-else type="info">{{ status }}</ElTag>
</template>
