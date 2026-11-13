import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: ['index.html', 'services/index.html', 'products/index.html', 'about/index.html', 'contact/index.html', 'sysbastion/index.html'],
    },
  },
});
