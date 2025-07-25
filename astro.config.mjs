// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { VitePWA } from 'vite-plugin-pwa';

// https://astro.build/config
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 4321,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Security-Policy': "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://*.gstatic.com https://unpkg.com;",
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    }
  },
  integrations: [
    react(),
    tailwind(),
  ],
  vite: {
    server: {
      host: '0.0.0.0',
      port: 4321,
      strictPort: true,
      hmr: {
        // Use localhost instead of ales.pkc.pub for local development
        clientPort: 4321,
        port: 4321
      },
      allowedHosts: [
        'ales.pkc.pub',
        'localhost',
        '0.0.0.0',
        '127.0.0.1'
      ],
      cors: true,
      fs: {
        allow: ['..']
      }
    },
    // @ts-ignore
    plugins: [
      // @ts-expect-error: Type incompatibility between VitePWA and Vite plugins
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icons/*.png', 'robots.txt', 'apple-touch-icon.png'],
        manifest: {
          name: 'PKC Interactive Experience',
          short_name: 'PKC',
          description: 'PKC Interactive Experience',
          theme_color: '#4f46e5',
          background_color: '#f8fafc',
          display: 'standalone',
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cdn-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ]
  }
});