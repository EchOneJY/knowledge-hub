<script lang="ts" setup>
import { computed, onMounted, reactive, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';
import { useAccessStore, useUserStore } from '@vben/stores';

import {
  ElButton,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
  ElSwitch,
} from 'element-plus';

import { documentApi, teamApi } from '#/api';
import type { DocumentItem, TeamItem } from '#/api';
import { ApiError } from '#/api/request';
import { SectionTitle } from '#/components/section-title';
import { canWriteDocument, flattenTeams } from '#/utils';
import { hasAccessByCodes } from '#/utils/access';

/** 新建 / 编辑文档共用表单。 */
defineOptions({ name: 'DocumentEdit' });

const route = useRoute();
const router = useRouter();
const accessStore = useAccessStore();
const userStore = useUserStore();
const id = route.params.id ? String(route.params.id) : '';
const isNew = !id;

const loading = shallowRef(!isNew);
const forbidden = shallowRef(false);
const teams = shallowRef<TeamItem[]>([]);
const doc = shallowRef<DocumentItem | null>(null);
const form = reactive({
  content: '',
  isPublic: false,
  summary: '',
  tags: '',
  teamId: undefined as undefined | string,
  title: '',
});

const teamOptions = computed(() => {
  const options = teams.value.map((team) => ({
    label: team.teamName,
    value: team.id,
  }));
  if (doc.value?.teamId && !options.some((item) => item.value === doc.value?.teamId)) {
    options.push({ label: '当前团队', value: doc.value.teamId });
  }
  return options;
});

async function loadTeams() {
  try {
    const rows = hasAccessByCodes(accessStore.accessCodes, ['ROLE_ADMIN'])
      ? flattenTeams(await teamApi.tree())
      : await teamApi.mine();
    teams.value = rows;
  } catch {
    teams.value = [];
  }
}

async function load() {
  if (!id) return;
  loading.value = true;
  try {
    const next = await documentApi.get(id);
    if (!canWriteDocument(accessStore.accessCodes, userStore.userInfo?.userId, next)) {
      forbidden.value = true;
      ElMessage.error('无权编辑该文档');
      return;
    }
    doc.value = next;
    Object.assign(form, {
      content: next.content ?? '',
      isPublic: next.isPublic,
      summary: next.summary ?? '',
      tags: next.tags ?? '',
      teamId: next.teamId || undefined,
      title: next.title,
    });
  } catch (error) {
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

async function save() {
  if (!form.title.trim() || !form.content.trim()) {
    ElMessage.warning('请填写标题和正文');
    return;
  }
  const payload = {
    content: form.content,
    isPublic: form.isPublic,
    summary: form.summary || undefined,
    tags: form.tags || undefined,
    teamId: form.teamId || null,
    title: form.title,
  };
  try {
    if (isNew) {
      const created = await documentApi.create({ ...payload, status: 0 });
      ElMessage.success('已保存为草稿');
      await router.push(`/documents/${created.id}`);
    } else {
      await documentApi.update(id, payload);
      ElMessage.success('已保存');
      await router.push(`/documents/${id}`);
    }
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '保存失败');
  }
}

onMounted(() => {
  void loadTeams();
  void load();
});
</script>

<template>
  <!-- 固定高度：页面不滚动，表单内部滚动 -->
  <div v-loading="loading" class="flex h-[var(--vben-content-height)] flex-col p-4">
    <ElEmpty v-if="forbidden && !loading" class="m-auto" description="无权编辑该文档">
      <ElButton @click="router.push('/documents')">返回列表</ElButton>
    </ElEmpty>

    <template v-else>
      <div class="bg-card mb-4 rounded-lg border px-4 py-3">
        <div class="flex items-center gap-2">
          <SectionTitle
            :icon="isNew ? 'lucide:file-plus' : 'lucide:file-pen'"
            :title="isNew ? '新建文档' : '编辑文档'"
          />
          <span class="text-muted-foreground hidden text-sm lg:block">
            公开：所有登录用户可见。指定团队：发布后团队成员可见。都不选：仅自己可见。
          </span>
        </div>
      </div>

      <div class="bg-card min-h-0 flex-1 overflow-y-auto rounded-lg border p-6">
        <ElForm class="max-w-4xl" label-position="top" @submit.prevent="save">
          <ElFormItem label="标题" required>
            <ElInput v-model="form.title" />
          </ElFormItem>
          <ElFormItem label="摘要">
            <ElInput v-model="form.summary" :rows="2" type="textarea" />
          </ElFormItem>
          <ElFormItem label="标签">
            <ElInput v-model="form.tags" placeholder="逗号分隔，如 SOP,发布" />
          </ElFormItem>
          <ElFormItem label="公开">
            <ElSwitch v-model="form.isPublic" />
            <span class="text-muted-foreground ml-3 text-xs">
              打开后，已发布文档对所有登录用户可见
            </span>
          </ElFormItem>
          <ElFormItem label="所属团队">
            <ElSelect
              v-model="form.teamId"
              clearable
              :disabled="!teamOptions.length"
              placeholder="不指定则仅自己可见（未公开时）"
            >
              <ElOption
                v-for="team in teamOptions"
                :key="team.value"
                :label="team.label"
                :value="team.value"
              />
            </ElSelect>
            <div class="text-muted-foreground mt-1 text-xs">
              {{ teamOptions.length ? '发布后，该团队成员可见（即使未公开）' : '你尚未加入任何团队，只能设为公开或仅自己可见' }}
            </div>
          </ElFormItem>
          <ElFormItem label="正文（Markdown）" required>
            <ElInput v-model="form.content" :rows="18" type="textarea" />
          </ElFormItem>
          <ElButton type="primary" @click="save">
            <IconifyIcon class="mr-1" icon="lucide:save" />
            保存
          </ElButton>
          <ElButton class="ml-3" @click="router.back()">取消</ElButton>
        </ElForm>
      </div>
    </template>
  </div>
</template>
