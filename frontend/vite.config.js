import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/', // Cloudflare Pages 使用根路径
  server: { port: 5173 }
})
