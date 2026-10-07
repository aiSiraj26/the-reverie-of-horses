// Builds the hosted demo: one self-contained HTML file, no server needed.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  define: { 'import.meta.env.VITE_STATIC': JSON.stringify('true') },
  build: { outDir: 'dist-demo', emptyOutDir: true },
});
