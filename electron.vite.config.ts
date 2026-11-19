import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: '.output/main',
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: '.output/preload',
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer')
      }
    },
    plugins: [react(), tailwindcss()],
    build: {
      outDir: '.output/renderer',
    },
  }
})