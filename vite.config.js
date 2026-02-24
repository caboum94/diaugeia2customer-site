import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Publicflow Browser',
        short_name: 'Publicflow',
        description: 'KIMDIS data browser',
        theme_color: '#0d7a6f',
        background_color: '#f4f8f7',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'vite.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
});
