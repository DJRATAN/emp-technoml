import { test, expect } from '@playwright/test';

test('admin settings page loads for super admin', async ({ page }) => {
  // Go to the app root (login page)
  await page.goto('http://localhost:8080/login');

  // Click the "Are you a Platform Admin?" shortcut
  await page.getByRole('button', { name: /Platform Admin/ }).click();

  // Fill login credentials (super admin created in create_super_admin.js)
  await page.fill('#login-email', 'ratanprajapati1242@gmail.com');
  await page.fill('#login-pwd', 'Google@123456@');

  // Submit the login form
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for redirect to a dashboard (super‑admin or admin)
  await page.waitForSelector('h1:has-text("Platform Command Center")', { timeout: 30000 });

  // Navigate directly to the Admin Settings page
  await page.goto('http://localhost:8080/admin/settings');
    await page.screenshot({ path: 'admin-settings-after-goto.png', fullPage: true });

  // Verify the Settings heading is present
  await page.waitForSelector('h1:has-text("Settings")', { timeout: 60000 });

  // Capture a screenshot for verification (saved in the repo root)
  await page.screenshot({ path: 'admin-settings.png', fullPage: true });
});
