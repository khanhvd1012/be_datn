import { defineConfig } from 'vite'
import { VitePluginNode } from 'vite-plugin-node'
import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

export default defineConfig({
  plugins: [
    ...VitePluginNode({
      adapter: 'express',
      appPath: './index',
      exportName: 'app'
    })
  ],
  server: {
    port: process.env.PORT
  }
})