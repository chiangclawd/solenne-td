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
        globPatterns: ['**/*.{js,css,html,png,webp,json,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
});
