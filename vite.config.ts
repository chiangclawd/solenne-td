import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages hosts under /<repo>/ by default. Pass VITE_BASE=/solenne-td/ via CI.
// Locally defaults to '/'.
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'icon.svg',
        'icons/*.png',
        'assets/kenney/PNG/default-size/*.png',
        'assets/portraits/*.svg',
        'assets/portraits/*.png',
        'assets/portraits/*.webp',
        'assets/covers/*.png',
        'assets/covers/*.webp',
        'assets/hero.png',
        'assets/hero.webp',
        'levels/*.json',
      ],
      manifest: {
        name: '索倫的最後防線',
        short_name: '索倫 TD',
        description: '一場塔防戰役 — 守護索倫王國對抗鐵潮入侵。',
        theme_color: '#050810',
        background_color: '#050810',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        lang: 'zh-Hant',
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // NOTE: html and levels/*.json are deliberately NOT precached — they
        // go through runtimeCaching NetworkFirst below so fresh deployments
        // (balance tweaks, new bundle hash) apply on the very next app open.
        // Everything else is still precached so the shell loads instantly
        // and the game works offline.
        globPatterns: ['**/*.{js,css,png,webp,svg,webmanifest}'],
        globIgnores: ['**/levels/*.json'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        // Fallback when a navigation request fails offline
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // index.html and any navigation: try network first (2s timeout),
            // fall back to cached shell. 2s keeps the offline launch snappy.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-shell',
              networkTimeoutSeconds: 2,
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Level JSONs: try network first so re-balanced waves apply
            // immediately. Falls back to last successful copy offline.
            urlPattern: ({ url }) =>
              url.pathname.includes('/levels/') && url.pathname.endsWith('.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'levels-json',
              networkTimeoutSeconds: 2,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
});
