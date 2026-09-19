<script lang="ts" setup>
import { computed, shallowRef } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { ElEmpty, ElMessage, ElTag } from 'element-plus';

import { searchApi } from '#/api';
import type { SearchHit } from '#/api';
import { useVbenForm } from '#/adapter/form';
import { ApiError } from '#/api/request';
import { FileTypeIcon } from '#/components/file-type-icon';
import { SectionTitle } from '#/components/section-title';
import { DOC_STATUS, formatTime, safeHighlight, visibilityMeta } from '#/utils';

/** 全文检索：搜索项统一走 useVbenForm，结果卡片保留高亮摘要，状态过滤在前端执行。 */
defineOptions({ name: 'Search' });

const router = useRouter();
const page = shallowRef(1);
const pageSize = 10;
const total = shallowRef(0);
const items = shallowRef<SearchHit[]>([]);
const loading = shallowRef(false);
const elapsed = shallowRef<number | null>(null);
const searched = shallowRef(false);

// 记录最近一次提交的检索条件，供翻页时复用
const query = shallowRef<{ categoryId?: string; keyword: string; status?: number }>({
  keyword: '',
});

const statusOptions = Object.entries(DOC_STATUS).map(([value, meta]) => ({
  label: meta.label,
  value: Number(value),
}));

const [SearchForm] = useVbenForm({
  actionWrapperClass: 'gap-1',
  commonConfig: { hideLabel: true },
  handleSubmit: onSubmit,
  resetButtonOptions: { content: '清空' },
  schema: [
    {
      component: 'Input',
      componentProps: { clearable: true, placeholder: '输入关键词，检索你有权限的文档' },
      fieldName: 'keyword',
      formItemClass: 'lg:col-span-2',
    },
    {
      component: 'Input',
      componentProps: { clearable: true, placeholder: '分类 ID' },
      fieldName: 'categoryId',
    },
    {
      component: 'Select',
      componentProps: { clearable: true, options: statusOptions, placeholder: '文档状态' },
      fieldName: 'status',
    },
  ],
  showCollapseButton: false,
  submitButtonOptions: { content: '搜索' },
  submitOnEnter: true,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5',
});

async function onSubmit(values: Record<string, unknown>) {
  const keyword = String(values.keyword ?? '').trim();
  if (!keyword) {
    ElMessage.warning('请输入关键词');
    return;
  }
  query.value = {
    categoryId: (values.categoryId as string) || undefined,
    keyword,
    status: values.status as number | undefined,
  };
  await runSearch(1);
}

async function runSearch(nextPage: number) {
  const { categoryId, keyword, status } = query.value;
  loading.value = true;
  searched.value = true;
  const started = performance.now();
  try {
    const res = await searchApi.search({ categoryId, keyword, page: nextPage, pageSize });
    const filtered =
      status === undefined ? res.items : res.items.filter((item) => item.status === status);
    items.value = filtered;
    total.value = status === undefined ? res.total : filtered.length;
    page.value = nextPage;
    elapsed.value = (performance.now() - started) / 1000;
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '搜索失败');
  } finally {
    loading.value = false;
  }
}

const resultMeta = computed(() =>
  elapsed.value === null
    ? ''
    : `找到约 ${total.value} 条可见结果（用时 ${elapsed.value.toFixed(2)} 秒）`,
);

// 文档标签存为逗号分隔字符串，拆成去空的关键词数组供标签展示（对照 react-app SearchPage）
function docTags(tags?: null | string) {
  return (tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}
</script>

<template>
  <!-- 固定高度：页面白底铺满，结果区内部滚动 -->
  <div class="flex h-[calc(100vh-50px)] flex-col p-4">
    <div class="bg-card flex min-h-0 flex-1 flex-col rounded-lg border">
      <!-- 顶部：标题 + 单行搜索，固定不滚动 -->
      <div class="px-4 py-3">
        <div class="mb-3 flex items-center gap-2">
          <span class="text-muted-foreground hidden text-sm lg:inline">
            只会检索你有权限的已发布文档：公开、所在团队，以及自己写的。
          </span>
        </div>

        <SearchForm />

        <div
          v-if="elapsed !== null"
          class="text-muted-foreground/70 flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          <span v-if="resultMeta">{{ resultMeta }}</span>
          <span class="ml-auto">相关度排序</span>
        </div>
      </div>

      <!-- 结果区：内部滚动 -->
      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <ElEmpty v-if="!items.length && searched && !loading" description="没有匹配的可见文档" />

        <div class="divide-border divide-y">
        <article
          v-for="hit in items"
          :key="hit.id"
          class="search-hit py-4 first:pt-0"
        >
          <div class="flex gap-3">
            <FileTypeIcon :name="hit.title" :size="28" />
            <div class="min-w-0 flex-1">
              <h3
                class="m-0 line-clamp-1 cursor-pointer text-base font-semibold text-primary hover:underline"
                @click="router.push(`/documents/${hit.id}`)"
                v-html="safeHighlight(hit.highlight.title[0] || hit.title)"
              />
              <p
                v-if="hit.highlight.content[0] || hit.highlight.summary[0] || hit.summary"
                class="text-muted-foreground mt-2 mb-0 line-clamp-2 text-sm leading-relaxed"
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
                <ElTag v-if="hit.status != null" size="small" :type="DOC_STATUS[hit.status]?.type">
                  {{ DOC_STATUS[hit.status]?.label }}
                </ElTag>
                <ElTag size="small" :type="visibilityMeta(hit).type">
                  {{ visibilityMeta(hit).label }}
                </ElTag>

                <!-- 关键词标签：文档 tags 字段拆分展示并靠右，对照 react-app SearchPage -->
                <span
                  v-if="docTags(hit.tags).length"
                  class="ml-auto flex flex-wrap items-center gap-1.5"
                >
                  <ElTag
                    v-for="tag in docTags(hit.tags)"
                    :key="tag"
                    size="small"
                    type="info"
                    effect="plain"
                    round
                  >
                    {{ tag }}
                  </ElTag>
                </span>
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
  </div>
</template>

<style scoped>
/* ES 高亮命中词由 safeHighlight 注入 <em>,scoped 样式需用 :deep 穿透到 v-html 内容 */
.search-hit :deep(em) {
  font-style: normal;
  background: #fff1b8;
  color: inherit;
}

.dark .search-hit :deep(em) {
  background: rgb(250 204 21 / 22%);
}
</style>
