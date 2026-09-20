import type { RouteRecordRaw } from 'vue-router';

/**
 * 检索类页面（搜索 / 问答 / 图谱），权限码均为 search。
 */
const routes: RouteRecordRaw[] = [
  {
    name: 'Search',
    path: '/search',
    component: () => import('#/views/search/index.vue'),
    meta: {
      authority: ['search'],
      icon: 'lucide:search',
      keepAlive: true,
      menuGroup: '知识检索',
      order: -18,
      title: '文档搜索',
    },
  },
  {
    name: 'Chat',
    path: '/chat',
    component: () => import('#/views/chat/index.vue'),
    meta: {
      affixTab: true,
      authority: ['search'],
      // 会话 id 放在 query(?session=xxx),默认 tab key 用 fullPath 会导致
      // 流式回答途中写入 query 时组件被重挂载、useChat 状态清空。改用 path 做 key,
      // query 变化不重挂载(对齐 react-app:切 search param 不重建组件)。
      fullPathKey: false,
      icon: 'lucide:messages-square',
      keepAlive: true,
      // 不归入「知识检索」分组,作为独立顶级菜单排在最前
      // 登录默认落地页
      order: -30,
      title: '智能问答',
    },
  },
  {
    name: 'Graph',
    path: '/graph',
    component: () => import('#/views/graph/index.vue'),
    meta: {
      authority: ['search'],
      icon: 'lucide:share-2',
      keepAlive: true,
      menuGroup: '知识检索',
      order: -16,
      title: '知识图谱',
    },
  },
];

export default routes;
