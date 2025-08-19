// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import { VitePWA } from 'vite-plugin-pwa';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    host: '0.0.0.0',
    port: 4321,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Security-Policy': "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://*.gstatic.com https://unpkg.com;",
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    }
  },
  devToolbar: { enabled: false },
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
      // Allow all hosts for flexibility in deployment environments
      allowedHosts: true,
      cors: true,
      fs: {
        allow: ['..']
      }
    },
    // Suppress CSS minification warnings for Radix UI components
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // Suppress radix CSS warnings
          if (warning.code === 'CSS_SYNTAX_ERROR' && warning.message.includes('radix')) {
            return;
          }
          warn(warning);
        }
      }
    },
    // @ts-ignore
    plugins: [
      // @ts-expect-error: Type incompatibility between VitePWA and Vite plugins
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icons/*.png', 'images/*.png', 'pwa-192x192.png', 'pwa-512x512.png', 'robots.txt'],
        manifest: {
          name: 'PKC Interactive Experience',
          short_name: 'PKC',
          description: 'PKC Interactive Experience',
          theme_color: '#4f46e5',
          background_color: '#f8fafc',
          display: 'standalone',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          // Only cache files that actually exist
          globPatterns: ['**/*.{js,css,html}', 'favicon.ico', 'icons/*.png', 'images/*.png', 'pwa-*.png', 'robots.txt'],
          skipWaiting: true,
          clientsClaim: true,
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