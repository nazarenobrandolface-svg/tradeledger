/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { feedProxyPlugin } from './feedProxy';

export default defineConfig({
  // All frontend assets live under frontend/ — npm scripts run from the repo
  // root, so the Vite project root must be pinned explicitly.
  root: __dirname,
  server: {
    port: 3000,
    strictPort: true
  },
  preview: {
    port: 3000,
    strictPort: true
  },
  plugins: [
    // Feeds (Forex Factory calendar, Google News RSS) go through a caching
    // middleware — the upstreams rate-limit with 429, which a plain proxy
    // would pass straight to the UI. See frontend/feedProxy.ts.
    feedProxyPlugin(),
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'TradeLedger',
        short_name: 'TradeLedger',
        description: 'Trading journal and analytics platform',
        theme_color: '#0F1222',
        background_color: '#0F1222',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          { name: 'Add Trade', short_name: 'Add', url: '/trades/new', icons: [{ src: 'icons/pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Daily Journal', short_name: 'Journal', url: '/journal', icons: [{ src: 'icons/pwa-192x192.png', sizes: '192x192' }] }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        // No manualChunks: function-based splitting kept recharts and tiptap
        // (with a duplicated React copy!) in vendor chunks that cycled back
        // into the entry chunk, throwing "Cannot access ... before
        // initialization" at startup — a blank page in production builds.
        // Rollup's default chunking keeps lazy libs (charts, editor, papaparse)
        // out of the entry graph without creating cross-chunk cycles.
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}']
  }
});
