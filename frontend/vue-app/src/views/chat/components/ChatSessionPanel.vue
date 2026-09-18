<script lang="ts" setup>
import { ElButton, ElEmpty, ElInput, ElMessage } from 'element-plus';

import type { ChatSession } from '#/api';
import { formatTime } from '#/utils';

/** 会话列表：新建、切换、重命名、删除。 */
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

let editingId = '';
let editingTitle = '';

function startRename(session: ChatSession) {
  editingId = session.id;
  editingTitle = session.title;
}

function submitRename() {
  const title = editingTitle.trim();
  if (!editingId || !title) return;
  emit('rename', editingId, title);
  editingId = '';
  editingTitle = '';
}

function removeSession(session: ChatSession) {
  if (props.busy) {
    ElMessage.warning('请等待当前回答结束再删除');
    return;
  }
  emit('remove', session.id);
}
</script>

<template>
  <aside class="bg-card flex h-full w-72 flex-col rounded-lg border">
    <div class="border-b p-3">
      <ElButton class="w-full" :disabled="busy" type="primary" @click="emit('create')">
        新建对话
      </ElButton>
    </div>
    <div class="flex-1 overflow-y-auto p-2">
      <ElEmpty v-if="!sessions.length" description="暂无历史对话" />
      <button
        v-for="session in sessions"
        :key="session.id"
        class="hover:bg-accent mb-1 w-full cursor-pointer rounded-md border-0 p-2 text-left"
        :class="session.id === activeId ? 'bg-accent' : 'bg-transparent'"
        type="button"
        @click="emit('select', session.id)"
      >
        <div v-if="editingId === session.id" @click.stop>
          <ElInput
            v-model="editingTitle"
            size="small"
            @keydown.enter="submitRename"
            @blur="submitRename"
          />
        </div>
        <template v-else>
          <div class="truncate text-sm font-medium">{{ session.title }}</div>
          <div class="text-muted-foreground mt-1 flex items-center justify-between text-xs">
            <span>{{ formatTime(session.updatedAt) }}</span>
            <span class="flex gap-2">
              <a class="text-primary" @click.stop="startRename(session)">重命名</a>
              <a class="text-destructive" @click.stop="removeSession(session)">删除</a>
            </span>
          </div>
        </template>
      </button>
    </div>
  </aside>
</template>
