import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// Plugin to generate version.json at build time
function versionPlugin() {
  return {
    name: 'version-plugin',
    writeBundle() {
      const version = {
        version: Date.now().toString(36),
        buildTime: new Date().toISOString()
      };
      fs.writeFileSync(
        path.resolve(__dirname, 'dist/version.json'),
        JSON.stringify(version)
      );
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), versionPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Reduce memory usage during build
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries into separate chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'chart-vendor': ['recharts'],
          'utils-vendor': ['axios', 'date-fns', 'framer-motion'],
          // Split the heaviest dependency
          'excel-vendor': ['xlsx']
        }
      },
      // Reduce memory usage
      maxParallelFileOps: 2
    },
    // Increase chunk size warning limit since we're now properly splitting
    chunkSizeWarningLimit: 1000
  }
})
