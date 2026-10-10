/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

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
        // Split heavyweight node_modules code into stable, cacheable vendor
        // chunks so the entry chunk stays small and unchanged deps are not
        // re-downloaded after every app release. Rule: never mix an eager
        // (entry-graph) dependency with a lazy-only dependency in one chunk,
        // or the lazy code gets pulled into first load.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          const p = id.replace(/\\/g, '/');
          // Keep lucide per-icon so only icons used on loaded pages ship.
          if (p.includes('/lucide-react/')) return undefined;
          // Lazy: notebook editor only.
          if (/@tiptap|\/prosemirror/.test(p)) return 'vendor-editor';
          // Eager but tiny (sanitizing is used by the data layer).
          if (p.includes('/dompurify/')) return 'vendor-sanitize';
          // Lazy: charts only.
          if (/\/(recharts|d3-[a-z-]+|internmap|delaunator|robust-predicates)\//.test(p)) {
            return 'vendor-charts';
          }
          // Lazy: CSV import only.
          if (p.includes('/papaparse/')) return 'vendor-import';
          // Eager core.
          if (/\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(p)) {
            return 'vendor-react';
          }
          if (p.includes('/@radix-ui/')) return 'vendor-ui';
          if (p.includes('/dexie/')) return 'vendor-db';
          return 'vendor';
        }
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
