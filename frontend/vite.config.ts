import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        ws: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching and performance
        manualChunks: {
          // React and related libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // UI library (Radix UI components)
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-switch'
          ],

          // State management and data fetching
          'state-vendor': ['zustand', '@tanstack/react-query', 'axios'],

          // Form libraries
          'forms-vendor': ['react-hook-form', 'zod'],

          // Date and time utilities
          'date-vendor': ['date-fns', 'date-fns-tz'],

          // Icons
          'icons-vendor': ['lucide-react'],

          // Utility libraries
          'utils-vendor': ['clsx', 'tailwind-merge']
        }
      }
    },

    // Chunk size warnings
    chunkSizeWarningLimit: 600, // 600KB

    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production', // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: process.env.NODE_ENV === 'production' ? ['console.log', 'console.info'] : []
      }
    },

    // Source maps (disable in production for smaller bundles)
    sourcemap: process.env.NODE_ENV !== 'production'
  },

  // Optimize deps
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'zustand',
      'axios'
    ]
  }
})