<script lang="ts" setup>
import { computed, onMounted, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useAccessStore, useUserStore } from '@vben/stores';

import {
  ElButton,
  ElEmpty,
  ElMessage,
  ElPopconfirm,
  ElTag,
} from 'element-plus';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

import { documentApi } from '#/api';
import type { DocumentItem } from '#/api';
import { ApiError } from '#/api/request';
import { FileTypeIcon } from '#/components/file-type-icon';
import { SectionTitle } from '#/components/section-title';
import { DOC_STATUS, canWriteDocument, formatTime, visibilityMeta } from '#/utils';
import { hasAccessByCodes } from '#/utils/access';

import DocumentEditModal from './modules/document-edit-modal.vue';

/** 文档详情：Markdown 渲染 + 作者/管理员生命周期操作。 */
defineOptions({ name: 'DocumentDetail' });

marked.use({ breaks: true, gfm: true });

const route = useRoute();
const router = useRouter();
const accessStore = useAccessStore();
const userStore = useUserStore();
const id = String(route.params.id ?? '');

const doc = shallowRef<DocumentItem | null>(null);
const loading = shallowRef(true);
const forbidden = shallowRef(false);

const canEdit = hasAccessByCodes(accessStore.accessCodes, ['document:edit']);
const canDelete = hasAccessByCodes(accessStore.accessCodes, ['document:delete']);
const writable = computed(() =>
  doc.value
    ? canWriteDocument(accessStore.accessCodes, userStore.userInfo?.userId, doc.value)
    : false,
);
const markdownHtml = computed(() =>
  doc.value?.content
    ? DOMPurify.sanitize(marked.parse(doc.value.content, { async: false }))
    : '',
);

async function load() {
  loading.value = true;
  forbidden.value = false;
  try {
    doc.value = await documentApi.get(id);
  } catch (error) {
    doc.value = null;
    if (error instanceof ApiError && error.status === 403) {
      forbidden.value = true;
      ElMessage.error('无权查看该文档');
    } else {
      ElMessage.error(error instanceof ApiError ? error.message : '加载失败');
    }
  } finally {
    loading.value = false;
  }
}

async function action(
  name: 'archive' | 'publish' | 'saveDraft',
  successText: string,
) {
  if (!doc.value) return;
  try {
    doc.value = await documentApi[name](id);
    ElMessage.success(successText);
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '操作失败');
  }
}

async function remove() {
  try {
    await documentApi.remove(id);
    ElMessage.success('已删除');
    await router.push('/documents');
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '删除失败');
  }
}

// 编辑弹框:点编辑就地打开,保存后重新拉取详情
const [DocumentEdit, docEditApi] = useVbenModal({
  connectedComponent: DocumentEditModal,
});
function openEdit() {
  docEditApi.setData({ id }).open();
}

onMounted(load);
</script>

<template>
  <!-- 固定高度：页面不滚动，正文内部滚动 -->
  <div v-loading="loading" class="flex h-[var(--vben-content-height)] flex-col p-4">
    <template v-if="doc">
      <div class="bg-card mb-4 rounded-lg border px-4 py-3">
        <div class="flex flex-wrap items-center gap-2">
          <!-- 返回列表:固定在最左 -->
          <ElButton  @click="router.push('/documents')">
            <IconifyIcon class="mr-1" icon="lucide:arrow-left" />
            返回列表
          </ElButton>
          <FileTypeIcon :name="doc.title" :size="26" />
          <SectionTitle
            class="min-w-0 flex-1"
            :title="doc.title"
          >
            <span class="text-muted-foreground ml-1 hidden text-sm lg:inline">
              更新于 {{ formatTime(doc.updatedAt) }}
            </span>
          </SectionTitle>
          <ElTag :type="DOC_STATUS[doc.status]?.type">{{ DOC_STATUS[doc.status]?.label }}</ElTag>
          <ElTag :type="visibilityMeta(doc).type">{{ visibilityMeta(doc).label }}</ElTag>
          <!-- 生命周期操作:成组靠右 -->
          <div class="ml-auto flex items-center gap-1">
            <ElButton v-if="canEdit && writable"  @click="openEdit()">
              <IconifyIcon class="mr-1" icon="lucide:pencil" />
              编辑
            </ElButton>
            <ElButton
              v-if="canEdit && writable && [0, 2].includes(doc.status)"
              type="primary"
              @click="action('publish', '已发布（若开启审核则进入待审）')"
            >
              <IconifyIcon class="mr-1" icon="lucide:send" />
              发布
            </ElButton>
            <template v-if="canEdit && writable && doc.status === 1">
              <ElButton  @click="action('saveDraft', '已下架为草稿')">
                <IconifyIcon class="mr-1" icon="lucide:undo-2" />
                下架
              </ElButton>
              <ElButton  @click="action('archive', '已归档')">
                <IconifyIcon class="mr-1" icon="lucide:archive" />
                归档
              </ElButton>
            </template>
            <ElPopconfirm
              v-if="canDelete && writable"
              title="确认删除该文档？"
              @confirm="remove"
            >
              <template #reference>
                <ElButton  type="danger">
                  <IconifyIcon class="mr-1" icon="lucide:trash-2" />
                  删除
                </ElButton>
              </template>
            </ElPopconfirm>
          </div>
        </div>
      </div>

      <div class="bg-card min-h-0 flex-1 overflow-y-auto rounded-lg border p-6">
        <p v-if="doc.summary" class="text-muted-foreground mt-0">{{ doc.summary }}</p>
        <div class="markdown-body" v-html="markdownHtml" />
      </div>
    </template>

    <ElEmpty
      v-else-if="!loading"
      class="m-auto"
      :description="forbidden ? '无权查看该文档' : '文档不存在或已删除'"
    >
      <ElButton @click="router.push('/documents')">返回列表</ElButton>
    </ElEmpty>

    <DocumentEdit @success="load()" />
  </div>
</template>
