<script lang="ts" setup>
import { computed, nextTick, onMounted, shallowRef, useTemplateRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { ElButton, ElInput, ElMessage } from 'element-plus';

import { aiApi, streamChat } from '#/api';
import type { ChatMessage, ChatSession, ChatSource } from '#/api';
import { ApiError } from '#/api/request';
import ChatMessageList from './components/ChatMessageList.vue';
import ChatSessionPanel from './components/ChatSessionPanel.vue';

/** AI 问答：流式回答、会话管理与引用展示。 */
defineOptions({ name: 'Chat' });

interface DisplayMessage {
  content: string;
  id: string;
  role: 'assistant' | 'user';
  sources?: ChatSource[] | null;
  status?: string;
}

const route = useRoute();
const router = useRouter();
const sessionId = computed(() => (route.query.session as string | undefined) || undefined);

const sessions = shallowRef<ChatSession[]>([]);
const messages = shallowRef<DisplayMessage[]>([]);
const input = shallowRef('');
const busy = shallowRef(false);
const loadedSessionId = shallowRef<string>();
const logRef = useTemplateRef<HTMLElement>('logRef');
let pinBottom = true;
let controller: AbortController | undefined;

async function loadSessions() {
  try {
    const res = await aiApi.sessions();
    sessions.value = res.items;
  } catch {
    // 会话列表失败不阻塞当前问答
  }
}

async function loadHistory(id?: string) {
  if (!id) {
    messages.value = [];
    return;
  }
  try {
    const rows = await aiApi.messages(id);
    messages.value = rows.map((row: ChatMessage) => ({
      content: row.content,
      id: row.id,
      role: row.role,
      sources: row.sources ?? null,
    }));
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '加载会话失败');
    await router.replace('/chat');
  }
}

function scrollToBottom() {
  if (!pinBottom) return;
  void nextTick(() => {
    logRef.value?.scrollTo({ top: logRef.value.scrollHeight });
  });
}

function onLogScroll() {
  const el = logRef.value;
  if (!el) return;
  pinBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
}

async function send() {
  const text = input.value.trim();
  if (!text || busy.value) return;
  input.value = '';
  pinBottom = true;
  busy.value = true;
  const userMessage: DisplayMessage = {
    content: text,
    id: `user-${Date.now()}`,
    role: 'user',
  };
  const assistantId = `assistant-${Date.now()}`;
  messages.value = [
    ...messages.value,
    userMessage,
    { content: '', id: assistantId, role: 'assistant' },
  ];
  scrollToBottom();

  controller = new AbortController();
  const textIds = new Set<string>();
  const updateAssistant = (patch: Partial<DisplayMessage>) => {
    messages.value = messages.value.map((message) =>
      message.id === assistantId ? { ...message, ...patch } : message,
    );
  };

  try {
    await streamChat(
      {
        messages: [{ parts: [{ text, type: 'text' }], role: 'user' }],
        messageId: assistantId,
        sessionId: sessionId.value,
        topK: 5,
        trigger: 'submit-message',
      },
      (event) => {
        if (event.type === 'text-start' && event.id) {
          textIds.add(event.id);
        } else if (event.type === 'text-delta' && textIds.has(event.id ?? '')) {
          const current = messages.value.find((item) => item.id === assistantId);
          updateAssistant({ content: (current?.content ?? '') + (event.delta ?? '') });
          scrollToBottom();
        } else if (event.type === 'data-session') {
          const data = event.data as { sessionId?: string } | undefined;
          if (data?.sessionId && data.sessionId !== sessionId.value) {
            loadedSessionId.value = data.sessionId;
            void router.replace(`/chat?session=${data.sessionId}`);
          }
        } else if (event.type === 'data-sources') {
          updateAssistant({ sources: event.data as ChatSource[] });
        } else if (event.type === 'data-status') {
          const data = event.data as { stage?: string; text?: string } | undefined;
          if (data?.stage !== 'generate') updateAssistant({ status: data?.text });
          else updateAssistant({ status: undefined });
        } else if (event.type === 'error') {
          ElMessage.error(event.errorText || '请求失败');
        }
      },
      controller.signal,
    );
  } catch (error) {
    if (!controller?.signal.aborted) {
      ElMessage.error(error instanceof Error ? error.message : '请求失败');
    }
  } finally {
    busy.value = false;
    controller = undefined;
    await loadSessions();
    scrollToBottom();
  }
}

function stop() {
  controller?.abort();
}

function switchSession(id?: string) {
  if (busy.value) {
    ElMessage.warning('请等待当前回答结束再切换会话');
    return;
  }
  void router.push(id ? `/chat?session=${id}` : '/chat');
}

async function createSession() {
  if (busy.value) {
    ElMessage.warning('请等待当前回答结束再开新对话');
    return;
  }
  try {
    const created = await aiApi.createSession();
    loadedSessionId.value = created.id;
    messages.value = [];
    await router.push(`/chat?session=${created.id}`);
    await loadSessions();
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '创建失败');
  }
}

async function renameSession(id: string, title: string) {
  try {
    await aiApi.renameSession(id, title);
    await loadSessions();
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '重命名失败');
  }
}

async function removeSession(id: string) {
  try {
    await aiApi.removeSession(id);
    if (id === sessionId.value) await router.push('/chat');
    await loadSessions();
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '删除失败');
  }
}

watch(
  sessionId,
  async (id) => {
    if (busy.value || loadedSessionId.value === id) return;
    loadedSessionId.value = id;
    await loadHistory(id);
    scrollToBottom();
  },
  { immediate: true },
);

onMounted(() => {
  void loadSessions();
});
</script>

<template>
  <div class="flex h-[calc(100vh-50px)] gap-4 p-4">
    <ChatSessionPanel
      :active-id="sessionId"
      :busy="busy"
      :sessions="sessions"
      @create="createSession"
      @remove="removeSession"
      @rename="renameSession"
      @select="switchSession"
    />

    <section class="bg-card flex min-w-0 flex-1 flex-col rounded-lg border">
      <div ref="logRef" class="flex-1 overflow-y-auto p-4" @scroll="onLogScroll">
        <div v-if="!messages.length" class="text-muted-foreground mt-16 text-center">
          <IconifyIcon class="mb-3 size-12" icon="lucide:messages-square" />
          <div>输入问题，基于你有权限的知识库内容生成回答。</div>
        </div>
        <ChatMessageList :messages="messages" :streaming="busy" />
      </div>
      <div class="border-t p-3">
        <div class="flex items-end gap-3">
          <ElInput
            v-model="input"
            :autosize="{ maxRows: 6, minRows: 2 }"
            :disabled="busy"
            placeholder="输入问题，Enter 发送，Shift + Enter 换行"
            type="textarea"
            @keydown.enter.exact.prevent="send"
          />
          <ElButton v-if="busy" @click="stop">
            <IconifyIcon class="mr-1" icon="lucide:square" />
            停止
          </ElButton>
          <ElButton v-else type="primary" @click="send">
            <IconifyIcon class="mr-1" icon="lucide:send-horizontal" />
            发送
          </ElButton>
        </div>
      </div>
    </section>
  </div>
</template>
