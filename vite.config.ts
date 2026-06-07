import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  publicDir: false,
  plugins: [vue(), dts({
    tsconfigPath: resolve(__dirname, 'tsconfig.app.json'),
    skipDiagnostics: true,
    entryRoot: resolve(__dirname, 'src'),
    outDir: resolve(__dirname, 'dist'),
    exclude: ['**/*.test.ts', '**/docs/**'],
    rollupTypes: true,
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
})