import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: './',
  server: {
    port: 5199,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react'))         return 'react';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('fuse.js'))       return 'fuse';
          if (id.includes('html5-qrcode'))  return 'qr';
          return undefined;
        },
      },
    },
  },
});
