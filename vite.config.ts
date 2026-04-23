import { execSync } from 'child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const localApiTarget = process.env.OFFGRIDOS_API_TARGET ?? 'http://127.0.0.1:3001';

function getBuildInfo(): string {
  const version = process.env.npm_package_version ?? '0.1.0';
  const envSha = [
    process.env.RAILWAY_GIT_COMMIT_SHA,
    process.env.GIT_COMMIT_SHA,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.CI_COMMIT_SHA,
  ].find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();

  let sha = envSha ?? '';

  if (!sha) {
    try {
      sha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      sha = 'local';
    }
  }

  return `v${version} @ ${sha}`;
}

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_INFO__: JSON.stringify(getBuildInfo()),
  },
  publicDir: 'public',
  build: {
    outDir: 'dist/web',
    emptyOutDir: false,
  },
  server: {
    host: '127.0.0.1',
    port: 3000,
    proxy: {
      '/api': {
        target: localApiTarget,
        changeOrigin: true,
      },
    },
  },
});
