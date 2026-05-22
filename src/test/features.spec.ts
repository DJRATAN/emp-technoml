import { test, expect } from '@playwright/test';

test('company admin login and features test', async ({ page }) => {
  // Go to the login page
  await page.goto('http://localhost:8080/login');

  // Search for company 'TechnoML'
  await page.fill('#company', 'TechnoML');
  await page.waitForSelector('button:has-text("TechnoML")', { timeout: 10000 });
  await page.click('button:has-text("TechnoML")');

  // Wait for company selection and login fields to be visible
  await page.waitForSelector('#login-email', { timeout: 10000 });

  // Fill company admin login credentials
  await page.fill('#login-email', 'gnome0259@gmail.com');
  await page.fill('#login-pwd', 'Google@123456@');

  // Submit the login form
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for redirect to admin dashboard
  await page.waitForURL('**/admin', { timeout: 30000 });
  console.log('Successfully logged in and reached /admin');
  
  // Wait a bit for features and stats to load
  await page.waitForTimeout(3000);
  
  // Ensure the dashboard title is visible
  await expect(page.locator('h1')).toContainText('Dashboard');
  
  // Take a screenshot of the dashboard
  await page.screenshot({ path: 'test-results/admin-dashboard.png', fullPage: true });

  // Navigate to Feature Flags page
  await page.goto('http://localhost:8080/admin/features');
  await page.waitForSelector('h1:has-text("Feature Flags")', { timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/admin-features.png', fullPage: true });
  console.log('Successfully loaded Feature Flags page');

  // Verify the feature switches are visible
  const chatSwitch = page.locator('button[role="switch"]').first();
  await expect(chatSwitch).toBeVisible();

  // Navigate back to the main dashboard
  await page.goto('http://localhost:8080/admin');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/admin-dashboard-final.png', fullPage: true });
});
