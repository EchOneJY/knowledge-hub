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
      authority: ['search'],
      icon: 'lucide:messages-square',
      menuGroup: '知识检索',
      order: -17,
      title: 'AI 智能问答',
    },
  },
  {
    name: 'Graph',
    path: '/graph',
    component: () => import('#/views/graph/index.vue'),
    meta: {
      authority: ['search'],
      icon: 'lucide:share-2',
      menuGroup: '知识检索',
      order: -16,
      title: '知识图谱',
    },
  },
];

export default routes;
