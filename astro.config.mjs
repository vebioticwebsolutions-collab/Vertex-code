import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server', // <-- This is the magic line that fixes the 403 error!
  vite: {
    plugins: [tailwindcss()]
  },
  adapter: node({
    mode: 'standalone',
  }),
});