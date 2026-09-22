import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig(({ command }) => ({
  publicDir: command === 'serve' ? 'public' : false,
  plugins: [vue(), dts({
    tsconfigPath: resolve(__dirname, 'tsconfig.app.json'),
    compilerOptions: {
      skipLibCheck: true,
    },
    entryRoot: resolve(__dirname, 'src'),
    outDirs: [resolve(__dirname, 'dist')],
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
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      // ESM only: maplibre-gl 6 ships no UMD or CJS build, so a UMD bundle of
      // ours would externalise a `maplibregl` global that cannot exist.
      formats: ['es'],
      fileName: 'vue-map-radius',
    },
    rollupOptions: {
      external: ['vue', 'maplibre-gl'],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      // What ships, minus what only exists to be rendered by hand.
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/**/*.test.ts', 'src/types/**', 'src/index.ts', 'src/vite-env.d.ts'],
      reporter: ['text', 'html'],
    },
  },
}))