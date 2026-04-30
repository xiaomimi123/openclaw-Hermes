import { test, expect } from './helpers/fixtures'

/**
 * P1-4 验收:虚拟公司页"新建"按钮跳到 OpenClaw 原生 /office 页面
 */
test('虚拟公司 - 新建按钮跳 /office', async ({ page }) => {
  await page.goto('/myworld')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1500)

  await expect(page.locator('h1:has-text("虚拟公司")')).toBeVisible()

  await page.locator('button:has-text("新建虚拟公司")').click()
  await page.waitForURL('**/office', { timeout: 8000 })

  // /office 页面应当渲染出来 —— 不再是 /myworld
  expect(page.url()).toContain('/office')
})
