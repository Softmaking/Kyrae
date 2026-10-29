import { defineConfig } from '@playwright/test';
import config from './playwright.config';
export default defineConfig({ ...config, use: { ...config.use, baseURL: 'http://localhost:4201' }, webServer: { command: 'pnpm start --host 127.0.0.1 --port 4201', url: 'http://localhost:4201', reuseExistingServer: false, timeout: 120000 } });
