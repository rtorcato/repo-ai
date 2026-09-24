import { expect, test } from '@playwright/test'

// Smoke test: assert the built site serves and its core UI renders. Deliberately
// content-agnostic — it validates "the site builds and boots", not copy.
test('homepage responds and renders the shell', async ({ page }) => {
	const res = await page.goto('./')
	expect(res?.ok()).toBeTruthy()
	await expect(page.locator('.navbar')).toBeVisible()
})

test('the starter doc renders a heading', async ({ page }) => {
	await page.goto('./')
	await expect(page.locator('h1')).toBeVisible()
})
