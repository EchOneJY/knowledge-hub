import { defineConfig } from '@vben/vite-config';

import ElementPlus from 'unplugin-element-plus/vite';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      // vue-router 因 peer 差异在 pnpm 里存在多份物理副本（vue/pinia 已由 overrides 统一，
      // 唯独 vue-router 未纳入），生产打包会打进多个实例，导致 routerKey 不一致、
      // useRouter() inject 失败白屏。强制去重到单份规避。
      resolve: {
        dedupe: ['vue', 'vue-router', 'pinia'],
      },
      plugins: [
        ElementPlus({
          format: 'esm',
        }),
      ],
      server: {
        // 后端无全局前缀且未开 CORS，开发期由 Vite 把 /api 代理到 3000 并剥离前缀
        proxy: {
          '/api': {
            changeOrigin: true,
            target: 'http://localhost:3000',
            rewrite: (path) => path.replace(/^\/api/, ''),
          },
        },
        strictPort: true,
      },
    },
  };
});
