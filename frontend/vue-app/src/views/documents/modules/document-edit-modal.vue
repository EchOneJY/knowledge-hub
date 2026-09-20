<script lang="ts" setup>
import { computed, reactive, shallowRef } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useAccessStore, useUserStore } from '@vben/stores';

import {
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
import { canWriteDocument, flattenTeams } from '#/utils';
import { hasAccessByCodes } from '#/utils/access';

/** 新建 / 编辑文档弹框：由父组件 setData({ id }) 决定模式,无 id 为新建。 */
defineOptions({ name: 'DocumentEditModal' });

const emit = defineEmits<{ success: [] }>();

const accessStore = useAccessStore();
const userStore = useUserStore();

// 当前编辑的文档 id;为空即新建模式
const docId = shallowRef('');
const isEdit = computed(() => Boolean(docId.value));
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
  // 保留当前文档已绑定但不在可选列表里的团队,避免回填后显示为空
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

function resetForm() {
  doc.value = null;
  Object.assign(form, {
    content: '',
    isPublic: false,
    summary: '',
    tags: '',
    teamId: undefined,
    title: '',
  });
}

/** 编辑态:拉取文档并做作者/管理员权限校验,无权则关闭弹框 */
async function load(id: string) {
  modalApi.setState({ loading: true });
  try {
    const next = await documentApi.get(id);
    if (!canWriteDocument(accessStore.accessCodes, userStore.userInfo?.userId, next)) {
      ElMessage.error('无权编辑该文档');
      modalApi.close();
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
    ElMessage.error(error instanceof ApiError ? error.message : '加载失败');
    modalApi.close();
  } finally {
    modalApi.setState({ loading: false });
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
  modalApi.lock();
  try {
    if (docId.value) {
      await documentApi.update(docId.value, payload);
      ElMessage.success('已保存');
    } else {
      await documentApi.create({ ...payload, status: 0 });
      ElMessage.success('已保存为草稿');
    }
    modalApi.close();
    emit('success');
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '保存失败');
    modalApi.unlock();
  }
}

const [Modal, modalApi] = useVbenModal({
  onCancel() {
    modalApi.close();
  },
  async onConfirm() {
    await save();
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const { id } = modalApi.getData<{ id?: string }>() ?? {};
    docId.value = id ?? '';
    resetForm();
    await loadTeams();
    if (docId.value) await load(docId.value);
  },
});
</script>

<template>
  <Modal
    class="w-[900px]"
    confirm-text="保存"
    content-class="grow min-h-0 overflow-y-auto px-5 py-4"
    fullscreen-button
    :title="isEdit ? '编辑文档' : '新建文档'"
  >
    <ElForm label-position="top" @submit.prevent>
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
        <ElInput v-model="form.content" :rows="16" type="textarea" />
      </ElFormItem>
    </ElForm>
  </Modal>
</template>
