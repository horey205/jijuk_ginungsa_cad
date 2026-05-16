import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/jijuk_ginungsa_cad/', // 깃허브 저장소 이름을 base 경로로 설정
})
