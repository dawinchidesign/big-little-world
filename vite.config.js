import {defineConfig} from 'vite';
export default defineConfig({base:'./',build:{target:'es2020',chunkSizeWarningLimit:1800,assetsInlineLimit:0,rollupOptions:{output:{manualChunks:undefined}}},server:{host:'0.0.0.0'}});
