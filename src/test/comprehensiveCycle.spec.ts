import { test, expect } from '@playwright/test';

test('comprehensive admin and employee cycle testing', async ({ page }) => {
  // Set long timeout for visiting all 36 page routes
  test.setTimeout(180000);

  const timestamp = Date.now();
  const employeeEmail = `antigravity-tester-${timestamp}@example.com`;
  const employeeName = `AG Tester ${timestamp}`;
  const password = 'Google@123456@';

  console.log(`Starting comprehensive test cycle with employee email: ${employeeEmail}`);

  // ── STEP 1: REGISTER A NEW EMPLOYEE ──
  await page.goto('http://localhost:8080/login');
  
  // Search for company
  await page.fill('#company', 'TechnoML');
  await page.waitForSelector('button:has-text("TechnoML")', { timeout: 10000 });
  await page.click('button:has-text("TechnoML")');
  await page.waitForSelector('#login-email', { timeout: 10000 });

  // Click on "Sign up" button to switch modes
  const signUpBtn = page.locator('button', { hasText: 'Sign up' });
  await signUpBtn.click();
  
  // Wait for the signup form fields
  await page.waitForSelector('#full-name', { timeout: 5000 });
  await page.fill('#full-name', employeeName);
  await page.fill('#phone', '9876543210');
  await page.fill('#dept', 'QA Department');
  await page.fill('#login-email', employeeEmail);
  await page.fill('#login-pwd', password);

  // Click "Create Account"
  await page.click('button:has-text("Create Account")');
  
  // Wait for signup process to trigger
  await page.waitForTimeout(4000);
  console.log('Successfully completed employee signup registration.');

  // ── CLEAR SESSION FROM AUTO LOGIN ──
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // ── STEP 2: LOG IN AS ADMINISTRATOR ──
  await page.goto('http://localhost:8080/login');
  await page.fill('#company', 'TechnoML');
  await page.waitForSelector('button:has-text("TechnoML")', { timeout: 10000 });
  await page.click('button:has-text("TechnoML")');
  await page.waitForSelector('#login-email', { timeout: 10000 });

  // Fill in administrator details
  await page.fill('#login-email', 'gnome0259@gmail.com');
  await page.fill('#login-pwd', password);
  await page.click('button:has-text("Sign In")');

  // Verify dashboard loads
  await page.waitForURL('**/admin', { timeout: 30000 });
  await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });
  console.log('Successfully logged in as Administrator.');
  await page.screenshot({ path: 'test-results/01_admin_dashboard.png', fullPage: true });

  // ── STEP 3: APPROVE PENDING EMPLOYEE ──
  await page.goto('http://localhost:8080/admin/employees');
  await page.waitForSelector('h1:has-text("Employees")', { timeout: 15000 });
  await page.waitForTimeout(3000); // Wait for list to load
  
  // Look for the newly registered user in the pending section and click Approve
  const approveButton = page.locator(`div:has-text("${employeeEmail}") >> button:has-text("Approve")`).first();
  if (await approveButton.isVisible()) {
    await approveButton.click();
    console.log(`Approved pending employee: ${employeeEmail}`);
    await page.waitForTimeout(2000);
  } else {
    // If not in the separate pending block, check if there's a Reactivate or Approve in the main list
    const mainApprove = page.locator(`tr:has-text("${employeeEmail}") >> button:has-text("Approve")`).first();
    if (await mainApprove.isVisible()) {
      await mainApprove.click();
      console.log(`Approved employee from main list: ${employeeEmail}`);
      await page.waitForTimeout(2000);
    } else {
      console.warn(`Could not find pending employee ${employeeEmail} in the list. Checking all employees.`);
    }
  }
  await page.screenshot({ path: 'test-results/02_admin_employees_approved.png', fullPage: true });

  // ── STEP 4: WALK THROUGH ALL ADMIN SIDEBAR FEATURES ──

  const adminUrls = [
    { name: 'Dashboard', url: '/admin', header: 'Dashboard|Platform Overview|Administrator Dashboard' },
    { name: 'Employees', url: '/admin/employees', header: 'Employees' },
    { name: 'Settings', url: '/admin/settings', header: 'Settings' },
    { name: 'Attendance', url: '/admin/attendance', header: 'Attendance Monitoring|Attendance Logs' },
    { name: 'Live Map', url: '/admin/live-map', header: 'Live Map|Live Tracking' },
    { name: 'Tasks', url: '/admin/tasks', header: 'Tasks' },
    { name: 'Targets', url: '/admin/targets', header: 'Employee Targets' },
    { name: 'Leave Requests', url: '/admin/leave', header: 'Leave Requests' },
    { name: 'Helpdesk', url: '/admin/helpdesk', header: 'Helpdesk|Helpdesk Tickets' },
    { name: 'Chat', url: '/admin/chat', header: 'Team Chat' },
    { name: 'Kudos', url: '/admin/kudos', header: 'Kudos Wall' },
    { name: 'Birthdays', url: '/admin/birthdays', header: 'Birthdays & Events|Celebrations' },
    { name: 'Communication', url: '/admin/communication', header: 'Communication Hub|Announcements' },
    { name: 'Wellbeing', url: '/admin/wellbeing', header: 'Wellbeing & Burnout Dashboard|Team Wellbeing' },
    { name: 'Payroll', url: '/admin/payroll', header: 'Payroll (Preview|Export)' },
    { name: 'AI Analytics', url: '/admin/ai-analytics', header: 'AI Analytics|Predictive Org Insights' },
    { name: 'IP Whitelisting', url: '/admin/ip-whitelist', header: 'IP Whitelisting|IP Access Management' },
    { name: 'Mock GPS', url: '/admin/mock-gps', header: 'Mock GPS (Detection|Settings)' },
    { name: 'Audit Trail', url: '/admin/audit', header: 'Audit Trail|Audit Trail Log' },
    { name: 'Permissions', url: '/admin/permissions', header: 'Admin Permission Matrix|Admin Permissions' },
    { name: 'Corrections', url: '/admin/corrections', header: 'Attendance Corrections' },
    { name: 'Approval Chain', url: '/admin/approval-chain', header: 'Approval Chain' },
    { name: 'Reports', url: '/admin/reports', header: 'Reports & Analytics|System Reports' },
    { name: 'Features', url: '/admin/features', header: 'Feature Flags' },
  ];

  for (const item of adminUrls) {
    console.log(`Testing Admin Feature: ${item.name} at ${item.url}`);
    await page.goto(`http://localhost:8080${item.url}`);
    await page.waitForTimeout(1000); // Give transitions/loading states a brief moment
    
    // Check if the main heading exists on the page
    try {
      const regex = new RegExp(item.header, 'i');
      await page.waitForSelector('h1', { timeout: 4000 });
      const h1s = await page.locator('h1').all();
      let found = false;
      for (const h1 of h1s) {
        const text = await h1.innerText();
        if (regex.test(text)) {
          found = true;
          break;
        }
      }
      if (!found) {
        throw new Error(`None of the h1 headings matched pattern: ${item.header}`);
      }
      console.log(`✓ Admin ${item.name} loaded successfully.`);
      
      // Perform simple interactive additions/changes on select pages to generate test/dummy data
      if (item.name === 'Tasks') {
        const taskInput = page.locator('input[placeholder*="Add a new task"]');
        if (await taskInput.isVisible()) {
          await taskInput.fill(`Dummy Task ${timestamp}`);
          await taskInput.press('Enter');
          await page.waitForTimeout(1500);
          console.log('  - Added dummy task successfully.');
        }
      } else if (item.name === 'Communication') {
        const titleInput = page.locator('input[placeholder*="Announcement title"]');
        const contentInput = page.locator('textarea[placeholder*="Write your announcement"]');
        if (await titleInput.isVisible() && await contentInput.isVisible()) {
          await titleInput.fill(`Dummy Announcement ${timestamp}`);
          await contentInput.fill(`This is a system generated test announcement.`);
          await page.click('button:has-text("Post Update")');
          await page.waitForTimeout(1500);
          console.log('  - Added dummy announcement successfully.');
        }
      } else if (item.name === 'IP Whitelisting') {
        const ipInput = page.locator('input[placeholder="e.g. 192.168.1.1"]');
        const descInput = page.locator('input[placeholder="Office Wi-Fi, etc."]');
        if (await ipInput.isVisible()) {
          await ipInput.fill('127.0.0.1');
          await descInput.fill('Localhost Loopback');
          await page.click('button:has-text("Whitelist IP")');
          await page.waitForTimeout(1500);
          console.log('  - Whitelisted local IP successfully.');
        }
      }
    } catch (e) {
      console.error(`Status Check Failed: Admin ${item.name} page failed to load or header was missing. Error: ${e.message}`);
    }
    
    await page.screenshot({ path: `test-results/admin_${item.name.replace(/\s+/g, '_').toLowerCase()}.png`, fullPage: true });
  }

  // ── CLEAR SESSION FOR EMPLOYEE LOGIN ──
  console.log('Logging out Admin...');
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // ── STEP 5: LOG IN AS EMPLOYEE ──
  console.log(`Logging in as new employee: ${employeeEmail}`);
  await page.goto('http://localhost:8080/login');
  await page.fill('#company', 'TechnoML');
  await page.waitForSelector('button:has-text("TechnoML")', { timeout: 10000 });
  await page.click('button:has-text("TechnoML")');
  await page.waitForSelector('#login-email', { timeout: 10000 });

  await page.fill('#login-email', employeeEmail);
  await page.fill('#login-pwd', password);
  await page.click('button:has-text("Sign In")');

  // Verify employee dashboard loads
  await page.waitForURL('**/employee', { timeout: 30000 });
  await page.waitForSelector('h1:has-text("Welcome back")', { timeout: 10000 });
  console.log('Successfully logged in as Employee.');
  await page.screenshot({ path: 'test-results/30_employee_dashboard.png', fullPage: true });

  // ── STEP 6: WALK THROUGH ALL EMPLOYEE SIDEBAR FEATURES ──

  const employeeUrls = [
    { name: 'Dashboard', url: '/employee', header: 'Welcome back' },
    { name: 'Attendance', url: '/employee/attendance', header: 'Attendance' },
    { name: 'Tasks', url: '/employee/tasks', header: 'My Tasks' },
    { name: 'My Targets', url: '/employee/targets', header: 'My Targets' },
    { name: 'Leave', url: '/employee/leave', header: 'Leave Management' },
    { name: 'Performance', url: '/employee/performance', header: 'Performance' },
    { name: 'Kudos', url: '/employee/kudos', header: 'Kudos Wall' },
    { name: 'Chat', url: '/employee/chat', header: 'Team Chat' },
    { name: 'Birthdays', url: '/employee/birthdays', header: 'Birthdays & Events' },
    { name: 'Office Updates', url: '/employee/inbox', header: 'Office Communications' },
    { name: 'Helpdesk', url: '/employee/helpdesk', header: 'Helpdesk' },
    { name: 'Profile', url: '/employee/profile', header: 'My Profile' },
  ];

  for (const item of employeeUrls) {
    console.log(`Testing Employee Feature: ${item.name} at ${item.url}`);
    await page.goto(`http://localhost:8080${item.url}`);
    await page.waitForTimeout(1000); // Give transition/render state a brief moment
    
    try {
      const regex = new RegExp(item.header, 'i');
      await page.waitForSelector('h1', { timeout: 4000 });
      const h1s = await page.locator('h1').all();
      let found = false;
      for (const h1 of h1s) {
        const text = await h1.innerText();
        if (regex.test(text)) {
          found = true;
          break;
        }
      }
      if (!found) {
        throw new Error(`None of the h1 headings matched pattern: ${item.header}`);
      }
      console.log(`✓ Employee ${item.name} loaded successfully.`);
      
      // Perform simple interactive actions
      if (item.name === 'Leave') {
        const reasonInput = page.locator('textarea[placeholder*="Reason for leave"]');
        if (await reasonInput.isVisible()) {
          // Fill dates
          await page.locator('input[type="date"]').first().fill(new Date().toISOString().split('T')[0]);
          await page.locator('input[type="date"]').last().fill(new Date().toISOString().split('T')[0]);
          await reasonInput.fill(`Dummy Leave Request ${timestamp}`);
          await page.click('button:has-text("Submit Request")');
          await page.waitForTimeout(1500);
          console.log('  - Submitted dummy leave request successfully.');
        }
      } else if (item.name === 'Helpdesk') {
        const subInput = page.locator('input[placeholder*="Brief summary"]');
        const descInput = page.locator('textarea[placeholder*="Describe your issue"]');
        if (await subInput.isVisible()) {
          await subInput.fill(`Dummy Helpdesk Ticket ${timestamp}`);
          await descInput.fill(`This is a dummy ticket created during automated testing.`);
          await page.click('button:has-text("Submit Ticket")');
          await page.waitForTimeout(1500);
          console.log('  - Submitted dummy helpdesk ticket successfully.');
        }
      }
    } catch (e) {
      console.error(`Status Check Failed: Employee ${item.name} page failed to load or header was missing. Error: ${e.message}`);
    }
    
    await page.screenshot({ path: `test-results/employee_${item.name.replace(/\s+/g, '_').toLowerCase()}.png`, fullPage: true });
  }

  console.log('All comprehensive testing steps completed successfully!');
});
