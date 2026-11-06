import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base muss zum Repo-Namen passen: https://<user>.github.io/wanncivspielen/
export default defineConfig({
  base: '/wanncivspielen/',
  plugins: [react()],
})
