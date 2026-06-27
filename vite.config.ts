import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig(({ command }) => ({
  publicDir: command === 'serve' ? 'public' : false,
  plugins: [vue(), dts({
    tsconfigPath: resolve(__dirname, 'tsconfig.app.json'),
    clean: true,
    tsBuildInfoFile: resolve(__dirname, 'node_modules/.tmp/tsbuildinfo'),
    compilerOptions: {
      skipLibCheck: true,
    },
    entryRoot: resolve(__dirname, 'src'),
    outDir: resolve(__dirname, 'dist'),
    exclude: ['**/*.test.ts', '**/docs/**', '**/vite-env.d.ts'],
    cleanVueFileName: true,
    staticImport: true,
  })],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VueMapRadius',
      fileName: 'vue-map-radius',
    },
    rollupOptions: {
      external: ['vue', 'maplibre-gl'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
          'maplibre-gl': 'maplibregl',
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
}))