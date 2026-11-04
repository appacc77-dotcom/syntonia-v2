import { defineConfig } from 'astro/config';

export default defineConfig({
  build: {
    format: 'file',
  },
  devToolbar: {
    enabled: false,
  },
  server: {
    host: '127.0.0.1',
    port: 4321,
  },
});
