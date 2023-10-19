import { svelte } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

let config = {
  plugins: [
    svelte({
      preprocess: [
        sveltePreprocess({
          typescript: true,
          scss: {
            renderSync: true,
          },
        }),
      ],
      onwarn(warning, defaultHandler) {
        if (warning.message.match('A11y')) return;
        defaultHandler(warning);
      },
    }),
    VitePWA({
      includeAssets: ['favicon.png', 'robots.txt'],
      manifest: {
        name: 'Incandenza 9000',
        short_name: 'Incandenza 9000',
        start_url: '/index.html',
        background_color: '#1c1c1c',
        theme_color: '#1c1c1c',
        id: 'i9000',
        dir: 'ltr',
        orientation: 'any',
        categories: ['music'],
        display: 'standalone',
        display_override: ['window-controls-overlay'],
        icons: [
          {
            src: '/images/icon16.png',
            sizes: '16x16',
            type: 'image/png',
          },
          {
            src: '/images/icon32.png',
            sizes: '32x32',
            type: 'image/png',
          },
          {
            src: '/images/icon48.png',
            sizes: '48x48',
            type: 'image/png',
          },
          {
            src: '/images/icon64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: '/images/icon72.png',
            sizes: '72x72',
            type: 'image/png',
          },
          {
            src: '/images/icon76.png',
            sizes: '76x76',
            type: 'image/png',
          },
          {
            src: '/images/icon96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: '/images/icon114.png',
            sizes: '114x114',
            type: 'image/png',
          },
          {
            src: '/images/icon120.png',
            sizes: '120x120',
            type: 'image/png',
          },
          {
            src: '/images/icon128.png',
            sizes: '128x128',
            type: 'image/png',
          },
          {
            src: '/images/icon144.png',
            sizes: '144x144',
            type: 'image/png',
          },
          {
            src: '/images/icon152.png',
            sizes: '152x152',
            type: 'image/png',
          },
          {
            src: '/images/icon180.png',
            sizes: '180x180',
            type: 'image/png',
          },
          {
            src: '/images/icon192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/images/icon256.png',
            sizes: '256x256',
            type: 'image/png',
          },
          {
            src: '/images/icon384.png',
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: '/images/icon512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/images/icon1024.png',
            sizes: '1024x1024',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  build: { target: 'esnext', minify: false, sourcemap: true },
  preview: { host: 'localhost', port: 8080 },
  server: { port: process.env.VITE_PORT || 4000 },
};

// noinspection JSUnusedGlobalSymbols
export default defineConfig(config);
