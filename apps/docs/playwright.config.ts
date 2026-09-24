import { defineConfig, devices } from '@playwright/test'
import base from '@rtorcato/repo-tooling/playwright'

export default defineConfig({
	...base,
	testDir: './tests',
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	use: {
		...base.use,
		baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000/repo-ai/',
	},
	webServer: {
		command: 'pnpm run build && pnpm exec docusaurus serve --port 3000',
		url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000/repo-ai/',
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
	},
})
