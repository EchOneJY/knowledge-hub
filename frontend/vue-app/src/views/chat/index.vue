<script lang="ts" setup>
import { computed, nextTick, onMounted, shallowRef, useTemplateRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAppConfig } from '@vben/hooks';
import { IconifyIcon } from '@vben/icons';
import { useAccessStore } from '@vben/stores';

import { useChat } from '@ai-sdk/vue';
import { DefaultChatTransport } from 'ai';
import { ElInput, ElMessage } from 'element-plus';

import { aiApi } from '#/api';
import type { ChatSession } from '#/api';
import { ApiError } from '#/api/request';
import ChatMessageParts from './components/ChatMessageParts.vue';
import ChatSessionPanel from './components/ChatSessionPanel.vue';
import { historyToUIMessages, type KhUIMessage } from './message-parts';

/** AI 问答:@ai-sdk/vue 流式 parts、会话管理与引用展示。对照 react-app ChatPage.tsx。 */
defineOptions({ name: 'Chat' });

const CHAT_ID = 'kh-chat';

const route = useRoute();
const router = useRouter();
const accessStore = useAccessStore();
const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
const sessionId = computed(
  () => (route.query.session as string | undefined) || undefined,
);

const sessions = shallowRef<ChatSession[]>([]);
const input = shallowRef('');
const logRef = useTemplateRef<HTMLElement>('logRef');
// 历史对话面板折叠态:顶部图标切换
const collapsed = shallowRef(false);

// 空会话引导示例:点击填入输入框,便于快速开问
const EXAMPLES = [
  '上线前如何做金丝雀验证?',
  '我们的告警分级规范是什么?',
  '数据库慢查询的排查步骤有哪些?',
];
// 已加载(或流式产生)的会话 id,用于 watch 去重,避免流式中被 watch 打断
const loadedSessionId = shallowRef<string | undefined>();
let pinBottom = true;
// 距底超过阈值时浮现「回到底部」按钮
const showScrollDown = shallowRef(false);

const transport = new DefaultChatTransport<KhUIMessage>({
  api: `${apiURL}/ai/chat/stream`,
  headers: () => {
    const token = accessStore.accessToken;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  },
});

const { messages, sendMessage, status, stop, error } = useChat<KhUIMessage>({
  id: CHAT_ID,
  transport,
  onData: (part) => {
    if (part.type !== 'data-session') return;
    const nextId = (part.data as { sessionId?: string }).sessionId;
    if (!nextId || nextId === sessionId.value) return;
    // 先记为已加载再跳转,防止 watch 把刚流式产生的消息清掉
    loadedSessionId.value = nextId;
    void router.replace(`/chat?session=${nextId}`);
  },
  onFinish: () => {
    void loadSessions();
  },
  onError: (err) => {
    ElMessage.error(err.message || '请求失败');
  },
});

const streaming = computed(
  () => status.value === 'submitted' || status.value === 'streaming',
);
const busy = streaming;

async function loadSessions() {
  try {
    const res = await aiApi.sessions();
    sessions.value = res.items;
  } catch {
    // 会话列表失败不阻塞当前问答
  }
}

function scrollToBottom() {
  if (!pinBottom) return;
  void nextTick(() => {
    logRef.value?.scrollTo({ top: logRef.value.scrollHeight });
  });
}

/** 点击「回到底部」按钮:强制平滑滚到底并重新贴底 */
function scrollDownClick() {
  const el = logRef.value;
  if (!el) return;
  pinBottom = true;
  el.scrollTo({ behavior: 'smooth', top: el.scrollHeight });
}

function onLogScroll() {
  const el = logRef.value;
  if (!el) return;
  const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  pinBottom = distanceToBottom < 80;
  // 需向上滚动较大距离(约整屏)才显示,避免小幅滚动就冒出来
  showScrollDown.value = distanceToBottom > el.clientHeight * 0.9;
}

async function send() {
  const text = input.value.trim();
  if (!text || busy.value) return;
  input.value = '';
  pinBottom = true;
  await sendMessage({ text }, { body: { sessionId: sessionId.value } });
}

/**
 * Enter 发送:中文/日文等输入法在选词、上屏时也会触发 keydown.enter,
 * 此时 event.isComposing 为 true(部分浏览器 keyCode 为 229),须放行给输入法确认,
 * 不当作发送,避免拼音上屏时被误发。
 */
function onEnter(event: Event) {
  const e = event as KeyboardEvent;
  if (e.isComposing || e.keyCode === 229) return;
  e.preventDefault();
  void send();
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
  // 当前已是空的新对话(无会话 id 且无消息),不重复新建
  if (!sessionId.value && !messages.value.length) {
    ElMessage.info('当前已是新对话');
    return;
  }
  // 不预建后端会话:仅回到空的新对话态。待用户发出首条消息时后端再创建会话,
  // 并经 onData(data-session) 回填 id、onFinish 刷新列表,避免空会话进入历史列表。
  loadedSessionId.value = undefined;
  messages.value = [];
  await router.push('/chat');
}

async function renameSession(id: string, title: string) {
  try {
    await aiApi.renameSession(id, title);
    await loadSessions();
  } catch (err) {
    ElMessage.error(err instanceof ApiError ? err.message : '重命名失败');
  }
}

async function removeSession(id: string) {
  if (busy.value) {
    ElMessage.warning('请等待当前回答结束再删除');
    return;
  }
  try {
    await aiApi.removeSession(id);
    if (id === sessionId.value) {
      loadedSessionId.value = undefined;
      messages.value = [];
      await router.push('/chat');
    }
    await loadSessions();
  } catch (err) {
    ElMessage.error(err instanceof ApiError ? err.message : '删除失败');
  }
}

// 切换会话:对照 react ChatPage.tsx 的 loadedSessionRef 去重 + streaming 保护。
// 保持旧内容直到新历史拉回一次性替换(不先清空 → 无空屏闪烁);只有回到无会话
// 或此前加载过时才清空。
watch(
  sessionId,
  async (id) => {
    if (streaming.value) return;
    if (!id) {
      if (loadedSessionId.value) {
        loadedSessionId.value = undefined;
        messages.value = [];
      }
      return;
    }
    if (loadedSessionId.value === id) return;
    loadedSessionId.value = id;
    try {
      const rows = await aiApi.messages(id);
      if (sessionId.value !== id) return; // 期间又切走了,丢弃本次结果
      messages.value = historyToUIMessages(rows);
      scrollToBottom();
    } catch (err) {
      loadedSessionId.value = undefined;
      ElMessage.error(err instanceof ApiError ? err.message : '加载会话失败');
      await router.replace('/chat');
    }
  },
  { immediate: true },
);

// 消息或状态变化后贴底
watch([messages, status], () => scrollToBottom());

onMounted(() => {
  void loadSessions();
});
</script>

<template>
  <div class="p-4 h-[var(--vben-content-height)]">
    <!-- 历史对话与聊天合并为一张卡片,顶部图标折叠/展开左侧历史面板 -->
    <div class="bg-card flex h-full overflow-hidden rounded-lg border">
      <ChatSessionPanel
        v-show="!collapsed"
        :active-id="sessionId"
        :busy="busy"
        :sessions="sessions"
        @create="createSession"
        @remove="removeSession"
        @rename="renameSession"
        @select="switchSession"
      />

      <section class="flex min-w-0 flex-1 flex-col">
        <div class="flex items-start gap-2 border-b px-4 pb-3 pt-3.5">
          <button
            class="collapse-btn"
            :title="collapsed ? '展开历史对话' : '收起历史对话'"
            type="button"
            @click="collapsed = !collapsed"
          >
            <IconifyIcon
              :icon="collapsed ? 'lucide:panel-left-open' : 'lucide:panel-left-close'"
            />
          </button>
          <div class="min-w-0">
            <h2 class="m-0 text-base font-semibold">智能问答</h2>
            <p class="text-muted-foreground mt-1 mb-0 text-sm leading-snug">
              只会检索你有权限的文档(公开、所在团队、自己写的)。流式回答会展示检索、思考与联网搜索过程,并写入左侧会话。
            </p>
          </div>
        </div>

      <div ref="logRef" class="flex-1 overflow-y-auto p-4" @scroll="onLogScroll">
        <div
          v-if="!messages.length"
          class="flex h-full flex-col items-center justify-center px-4 text-center"
        >
          <div
            class="bg-primary/10 text-primary mb-4 flex size-16 items-center justify-center rounded-full"
          >
            <IconifyIcon class="size-8" icon="lucide:messages-square" />
          </div>
          <h3 class="m-0 text-base font-semibold">开始一段智能问答</h3>
          <p class="text-muted-foreground mt-1.5 mb-5 max-w-md text-sm leading-relaxed">
            基于你有权限的知识库内容生成回答,并展示检索、思考与联网搜索过程。试试这些问题:
          </p>
          <div class="flex flex-wrap justify-center gap-2">
            <button
              v-for="q in EXAMPLES"
              :key="q"
              class="hover:border-primary hover:text-primary bg-card text-muted-foreground cursor-pointer rounded-full border px-3.5 py-1.5 text-xs transition-colors"
              type="button"
              @click="input = q"
            >
              {{ q }}
            </button>
          </div>
        </div>

        <div
          v-for="(m, i) in messages"
          :key="m.id"
          class="mb-4 w-fit max-w-[780px] rounded-[10px] px-3.5 py-3 text-sm leading-[1.7] [overflow-wrap:anywhere]"
          :class="
            m.role === 'user'
              ? 'bg-primary text-primary-foreground ml-auto rounded-tr-sm'
              : 'bg-muted rounded-tl-sm'
          "
        >
          <ChatMessageParts
            :message="m"
            :streaming="
              streaming && m.role === 'assistant' && i === messages.length - 1
            "
            :show-sources="
              !(streaming && m.role === 'assistant' && i === messages.length - 1)
            "
          />
        </div>

        <div v-if="error" class="text-destructive mt-2 text-sm">
          {{ error.message }}
        </div>
      </div>

      <div class="relative border-t p-3">
        <!-- 回到底部按钮:滚离底部一定距离时浮现在输入框正上方居中 -->
        <Transition name="scroll-down-fade">
          <button
            v-if="showScrollDown"
            class="scroll-down-btn"
            title="回到底部"
            type="button"
            @click="scrollDownClick"
          >
            <IconifyIcon class="size-4" icon="lucide:arrow-down" />
          </button>
        </Transition>

        <!-- 输入区:文本域占满,发送/停止做成图标按钮浮在右下角 -->
        <div class="chat-composer relative">
          <ElInput
            v-model="input"
            :autosize="{ maxRows: 6, minRows: 3 }"
            :disabled="busy"
            placeholder="例如:上线前如何做金丝雀验证?(Enter 发送,Shift + Enter 换行)"
            type="textarea"
            @keydown.enter.exact="onEnter"
          />
          <button
            v-if="streaming"
            class="composer-btn"
            title="停止"
            type="button"
            @click="stop"
          >
            <IconifyIcon class="size-4" icon="lucide:square" />
          </button>
          <button
            v-else
            class="composer-btn is-send"
            :disabled="!input.trim()"
            title="发送"
            type="button"
            @click="send"
          >
            <IconifyIcon class="size-4" icon="lucide:arrow-up" />
          </button>
        </div>
      </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* 发送/停止图标按钮浮在文本域右下角,给文本域留出右下内边距避免文字被遮 */
.chat-composer :deep(.el-textarea__inner) {
  padding-right: 46px;
}

/* 回到底部按钮:浮在输入框正上方居中 */
.scroll-down-btn {
  position: absolute;
  left: 50%;
  top: -52px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid hsl(var(--border));
  border-radius: 50%;
  background: hsl(var(--card));
  color: hsl(var(--muted-foreground));
  box-shadow: 0 2px 8px hsl(var(--foreground) / 0.12);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  z-index: 5;
}

.scroll-down-btn:hover {
  color: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.scroll-down-fade-enter-active,
.scroll-down-fade-leave-active {
  transition: opacity 0.18s, transform 0.18s;
}

.scroll-down-fade-enter-from,
.scroll-down-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 6px);
}

/* 顶部折叠历史对话按钮 */
.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  margin-top: 1px;
  border: none;
  border-radius: 6px;
  background: none;
  color: hsl(var(--muted-foreground));
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.collapse-btn:hover {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.1);
}

.composer-btn {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--accent));
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, opacity 0.15s;
}

.composer-btn:hover {
  color: hsl(var(--foreground));
}

.composer-btn.is-send {
  color: hsl(var(--primary-foreground));
  background: hsl(var(--primary));
}

.composer-btn.is-send:hover {
  opacity: 0.9;
}

.composer-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
</style>
