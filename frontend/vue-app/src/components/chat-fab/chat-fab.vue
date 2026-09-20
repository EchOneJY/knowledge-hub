<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';
import { useAccessStore } from '@vben/stores';

import { hasAccessByCodes } from '#/utils/access';

/**
 * 智能问答悬浮入口：固定在右下角，点击跳转 /chat。
 * 权限与 Chat 路由一致（search，admin 短路），无权限或已在问答页时不展示。
 */
const router = useRouter();
const route = useRoute();
const accessStore = useAccessStore();

const visible = computed(
  () =>
    route.path !== '/chat' &&
    hasAccessByCodes(accessStore.accessCodes, ['search']),
);

function goChat() {
  router.push('/chat');
}
</script>

<template>
  <button
    v-if="visible"
    class="bg-primary text-primary-foreground fixed bottom-12 right-8 z-[1000] flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
    title="智能问答"
    type="button"
    @click="goChat"
  >
    <IconifyIcon class="size-6" icon="lucide:messages-square" />
  </button>
</template>
