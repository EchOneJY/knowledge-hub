<script lang="ts" setup>
import { computed, shallowRef } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { ElButton, ElEmpty, ElInput, ElMessage, ElOption, ElSelect, ElTag } from 'element-plus';

import { searchApi } from '#/api';
import type { SearchHit } from '#/api';
import { ApiError } from '#/api/request';
import { FileTypeIcon } from '#/components/file-type-icon';
import { SectionTitle } from '#/components/section-title';
import { DOC_STATUS, formatTime, safeHighlight, visibilityMeta } from '#/utils';

/** 全文检索：结果卡片保留高亮摘要，状态过滤在前端执行。 */
defineOptions({ name: 'Search' });

const router = useRouter();
const keyword = shallowRef('');
const categoryId = shallowRef<string>();
const status = shallowRef<number>();
const page = shallowRef(1);
const pageSize = 10;
const total = shallowRef(0);
const items = shallowRef<SearchHit[]>([]);
const loading = shallowRef(false);
const elapsed = shallowRef<number | null>(null);
const searched = shallowRef(false);

const statusOptions = Object.entries(DOC_STATUS).map(([value, meta]) => ({
  label: meta.label,
  value: Number(value),
}));

async function runSearch(nextPage = 1) {
  const q = keyword.value.trim();
  if (!q) {
    ElMessage.warning('请输入关键词');
    return;
  }
  loading.value = true;
  searched.value = true;
  const started = performance.now();
  try {
    const res = await searchApi.search({
      categoryId: categoryId.value || undefined,
      keyword: q,
      page: nextPage,
      pageSize,
    });
    const filtered =
      status.value === undefined
        ? res.items
        : res.items.filter((item) => item.status === status.value);
    items.value = filtered;
    total.value = status.value === undefined ? res.total : filtered.length;
    page.value = nextPage;
    elapsed.value = (performance.now() - started) / 1000;
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '搜索失败');
  } finally {
    loading.value = false;
  }
}

function clearFilters() {
  categoryId.value = undefined;
  status.value = undefined;
}

const resultMeta = computed(() =>
  elapsed.value === null
    ? ''
    : `找到约 ${total.value} 条可见结果（用时 ${elapsed.value.toFixed(2)} 秒）`,
);
</script>

<template>
  <!-- 固定高度：页面不滚动，结果区内部滚动 -->
  <div class="flex h-[calc(100vh-50px)] flex-col p-4">
    <div class="bg-card rounded-lg border p-4">
      <div class="mb-4 flex items-center gap-2">
        <SectionTitle icon="lucide:search" title="文档搜索" />
        <span class="text-muted-foreground text-sm">
          只会检索你有权限的已发布文档：公开、所在团队，以及自己写的。
        </span>
      </div>

      <div class="mb-3 flex flex-wrap gap-3">
        <ElInput
          v-model="keyword"
          class="max-w-2xl"
          clearable
          placeholder="输入关键词，检索你有权限的文档"
          size="large"
          @keydown.enter="runSearch(1)"
        >
          <template #prefix>
            <IconifyIcon class="text-muted-foreground" icon="lucide:search" />
          </template>
        </ElInput>
        <ElButton :loading="loading" size="large" type="primary" @click="runSearch(1)">
          <IconifyIcon class="mr-1" icon="lucide:search" />
          搜索
        </ElButton>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <ElInput v-model="categoryId" class="!w-48" clearable placeholder="分类 ID" />
        <ElSelect v-model="status" class="!w-40" clearable placeholder="文档状态">
          <ElOption
            v-for="item in statusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </ElSelect>
        <ElButton @click="clearFilters">清空</ElButton>
        <span v-if="resultMeta" class="text-muted-foreground text-sm">{{ resultMeta }}</span>
        <span v-if="elapsed !== null" class="text-muted-foreground text-sm">相关度排序</span>
      </div>
    </div>

    <div class="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
      <ElEmpty v-if="!items.length && searched && !loading" description="没有匹配的可见文档" />

      <div class="space-y-3">
        <article
          v-for="hit in items"
          :key="hit.id"
          class="bg-card rounded-lg border p-4 transition hover:shadow-sm"
        >
          <div class="flex gap-3">
            <FileTypeIcon :name="hit.title" :size="28" />
            <div class="min-w-0 flex-1">
              <h3
                class="m-0 cursor-pointer text-base font-semibold text-primary hover:underline"
                @click="router.push(`/documents/${hit.id}`)"
                v-html="safeHighlight(hit.highlight.title[0] || hit.title)"
              />
              <p
                v-if="hit.highlight.content[0] || hit.highlight.summary[0] || hit.summary"
                class="text-muted-foreground mt-2 mb-0 line-clamp-2 text-sm"
                v-html="safeHighlight(hit.highlight.content[0] || hit.highlight.summary[0] || hit.summary || '')"
              />
              <div class="text-muted-foreground mt-3 flex flex-wrap items-center gap-3 text-xs">
                <span class="flex items-center gap-1">
                  <IconifyIcon icon="lucide:book" />
                  来自文档库
                </span>
                <span class="flex items-center gap-1">
                  <IconifyIcon icon="lucide:clock" />
                  更新于 {{ formatTime(hit.publishTime) }}
                </span>
                <ElTag v-if="hit.status != null" :type="DOC_STATUS[hit.status]?.type">
                  {{ DOC_STATUS[hit.status]?.label }}
                </ElTag>
                <ElTag :type="visibilityMeta(hit).type">{{ visibilityMeta(hit).label }}</ElTag>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-if="total > pageSize" class="mt-4 flex justify-end">
        <ElPagination
          :current-page="page"
          layout="total, prev, pager, next"
          :page-size="pageSize"
          :total="total"
          @current-change="(p: number) => runSearch(p)"
        />
      </div>
    </div>
  </div>
</template>
