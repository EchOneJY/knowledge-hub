import { defineConfig } from '@vben/vite-config';

import ElementPlus from 'unplugin-element-plus/vite';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
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
