import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/e2e',workers:1,timeout:45000,webServer:{command:'npm run demo',url:'http://127.0.0.1:4178',reuseExistingServer:false}});
