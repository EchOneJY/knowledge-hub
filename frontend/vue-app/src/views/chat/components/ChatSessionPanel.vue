<script lang="ts" setup>
import { IconifyIcon } from '@vben/icons';

import { ElButton, ElEmpty, ElMessage, ElMessageBox } from 'element-plus';

import type { ChatSession } from '#/api';
import { formatTime } from '#/utils';

/** 会话列表:新建、切换、重命名(弹框)、删除(二次确认)。样式对齐 react-app。 */
defineOptions({ name: 'ChatSessionPanel' });

const props = defineProps<{
  activeId?: string;
  busy: boolean;
  sessions: ChatSession[];
}>();
const emit = defineEmits<{
  create: [];
  remove: [id: string];
  rename: [id: string, title: string];
  select: [id?: string];
}>();

async function startRename(session: ChatSession) {
  try {
    const { value } = await ElMessageBox.prompt('请输入新的会话名称', '重命名会话', {
      cancelButtonText: '取消',
      confirmButtonText: '确定',
      inputErrorMessage: '名称不能为空',
      inputPattern: /\S/,
      inputValue: session.title,
    });
    const title = value.trim();
    if (title && title !== session.title) emit('rename', session.id, title);
  } catch {
    // 用户取消,忽略
  }
}

async function removeSession(session: ChatSession) {
  if (props.busy) {
    ElMessage.warning('请等待当前回答结束再删除');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确定删除会话「${session.title}」吗?删除后不可恢复。`,
      '删除会话',
      {
        cancelButtonText: '取消',
        confirmButtonText: '删除',
        type: 'warning',
      },
    );
    emit('remove', session.id);
  } catch {
    // 用户取消,忽略
  }
}
</script>

<template>
  <aside class="flex h-full w-60 shrink-0 flex-col border-r p-3">
    <ElButton
      class="w-full"
      :disabled="busy"
      type="primary"
      @click="emit('create')"
    >
      <IconifyIcon class="mr-1" icon="lucide:plus" />
      新对话
    </ElButton>

    <div class="mt-3 flex-1 overflow-y-auto">
      <ElEmpty v-if="!sessions.length" description="还没有会话" />
      <div
        v-for="session in sessions"
        :key="session.id"
        class="session-item"
        :class="{ 'is-active': session.id === activeId, 'is-disabled': busy }"
        @click="emit('select', session.id)"
      >
        <div class="session-item__title">{{ session.title }}</div>
        <div class="session-item__meta">
          <span>{{ formatTime(session.updatedAt) }}</span>
          <span class="session-item__actions">
            <button
              class="session-item__icon"
              title="重命名"
              type="button"
              @click.stop="startRename(session)"
            >
              <IconifyIcon icon="lucide:pencil" />
            </button>
            <button
              class="session-item__icon"
              title="删除"
              type="button"
              @click.stop="removeSession(session)"
            >
              <IconifyIcon icon="lucide:trash-2" />
            </button>
          </span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.session-item {
  padding: 10px 10px 8px;
  border-radius: 8px;
  margin-bottom: 4px;
  cursor: pointer;
}

.session-item:hover,
.session-item.is-active {
  background: hsl(var(--accent));
}

.session-item.is-active {
  background: hsl(var(--primary) / 0.1);
}

.session-item.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.session-item__title {
  font-size: 13px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.session-item__actions {
  display: flex;
  gap: 4px;
  /* 默认隐藏,悬浮到会话项才显现,减少视觉噪音 */
  opacity: 0;
  transition: opacity 0.15s;
}

.session-item:hover .session-item__actions {
  opacity: 1;
}

.session-item__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 5px;
  background: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.session-item__icon:hover {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.1);
}
</style>
