import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      tailwindcss(),
    ],
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.OPENROUTER_API_KEY': JSON.stringify(env.OPENROUTER_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    server: {
      proxy: {
        '/api/ai-engine': {
          target: 'https://integrate.api.nvidia.com',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/ai-engine/, '/v1/chat/completions'),
        }
      }
    }
  };
});
