import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: ['index.html', 'services/index.html', 'products/index.html', 'about/index.html', 'contact/index.html', 'sysbastion/index.html', 'design1/index.html', 'design2/index.html', 'design3/index.html', 'design3/specs/index.html', 'design4/index.html', 'design5/index.html', 'darkintel360/index.html', 'aegis-shield/index.html', 'shadowad/index.html'],
    },
  },
});
