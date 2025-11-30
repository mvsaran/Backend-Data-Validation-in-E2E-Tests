/**
 * Backend Validation Example - Playwright E2E Test
 * 
 * This test demonstrates how to validate backend data after performing UI actions.
 * 
 * Test Flow:
 * 1. Perform UI action (fill form and submit)
 * 2. Verify UI feedback (success message)
 * 3. Validate backend data using API request context
 * 4. Clean up test data
 */

const { test, expect } = require('@playwright/test');

test.describe('Backend Data Validation After UI Actions', () => {
    let createdUserId;

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test.afterEach(async ({ request }) => {
        // Clean up: Delete the created user from database
        if (createdUserId) {
            await request.delete(`/api/users/${createdUserId}`);
            createdUserId = null;
        }
    });

    test('should validate user data in backend after successful registration', async ({ page, request }) => {
        const testUser = {
            username: `testuser_${Date.now()}`,
            email: `test_${Date.now()}@example.com`,
            age: 25
        };

        // Step 1: Perform UI Action - Fill and submit the registration form
        await page.fill('#username', testUser.username);
        await page.fill('#email', testUser.email);
        await page.fill('#age', testUser.age.toString());
        await page.click('#submitBtn');

        // Step 2: Verify UI Feedback - Check success message is displayed
        await expect(page.locator('#userInfo')).toBeVisible();
        await expect(page.locator('#displayUsername')).toContainText(testUser.username);
        await expect(page.locator('#displayEmail')).toContainText(testUser.email);
        await expect(page.locator('#displayAge')).toContainText(testUser.age.toString());

        // Get the user ID from the UI
        const userIdText = await page.locator('#userId').textContent();
        createdUserId = parseInt(userIdText);

        // Step 3: Validate Backend Data - Verify data was saved correctly in database
        const response = await request.get(`/api/users/${createdUserId}`);
        expect(response.status()).toBe(200);

        const responseBody = await response.json();
        expect(responseBody.success).toBe(true);

        // Verify user data in backend matches what was submitted
        const backendUser = responseBody.user;
        expect(backendUser.id).toBe(createdUserId);
        expect(backendUser.username).toBe(testUser.username);
        expect(backendUser.email).toBe(testUser.email);
        expect(backendUser.age).toBe(testUser.age);
        expect(backendUser.created_at).toBeTruthy();
    });

    test('should validate user can be retrieved by username from backend', async ({ page, request }) => {
        const testUser = {
            username: `testuser_${Date.now()}`,
            email: `test_${Date.now()}@example.com`,
            age: 30
        };

        // Step 1: Create user via UI
        await page.fill('#username', testUser.username);
        await page.fill('#email', testUser.email);
        await page.fill('#age', testUser.age.toString());
        await page.click('#submitBtn');

        // Wait for success
        await expect(page.locator('#userInfo')).toBeVisible();
        const userIdText = await page.locator('#userId').textContent();
        createdUserId = parseInt(userIdText);

        // Step 2: Validate backend - Fetch user by username
        const response = await request.get(`/api/users/username/${testUser.username}`);
        expect(response.status()).toBe(200);

        const responseBody = await response.json();
        expect(responseBody.success).toBe(true);
        expect(responseBody.user.username).toBe(testUser.username);
        expect(responseBody.user.email).toBe(testUser.email);
        expect(responseBody.user.age).toBe(testUser.age);
    });

    test('should validate user appears in all users list', async ({ page, request }) => {
        const testUser = {
            username: `testuser_${Date.now()}`,
            email: `test_${Date.now()}@example.com`,
            age: 35
        };

        // Step 1: Create user via UI
        await page.fill('#username', testUser.username);
        await page.fill('#email', testUser.email);
        await page.fill('#age', testUser.age.toString());
        await page.click('#submitBtn');

        await expect(page.locator('#userInfo')).toBeVisible();
        const userIdText = await page.locator('#userId').textContent();
        createdUserId = parseInt(userIdText);

        // Step 2: Validate backend - Check user exists in all users list
        const response = await request.get('/api/users');
        expect(response.status()).toBe(200);

        const responseBody = await response.json();
        expect(responseBody.success).toBe(true);

        // Find our user in the list
        const users = responseBody.users;
        const ourUser = users.find(u => u.id === createdUserId);

        expect(ourUser).toBeTruthy();
        expect(ourUser.username).toBe(testUser.username);
        expect(ourUser.email).toBe(testUser.email);
        expect(ourUser.age).toBe(testUser.age);
    });

    test('should handle duplicate username error correctly', async ({ page, request }) => {
        const testUser = {
            username: `testuser_${Date.now()}`,
            email: `test_${Date.now()}@example.com`,
            age: 28
        };

        // Step 1: Create first user
        await page.fill('#username', testUser.username);
        await page.fill('#email', testUser.email);
        await page.fill('#age', testUser.age.toString());
        await page.click('#submitBtn');

        await expect(page.locator('#userInfo')).toBeVisible();
        const userIdText = await page.locator('#userId').textContent();
        createdUserId = parseInt(userIdText);

        // Step 2: Try to create another user with same username
        await page.click('#registerAnother');
        await page.fill('#username', testUser.username);
        await page.fill('#email', `different_${testUser.email}`);
        await page.fill('#age', '30');
        await page.click('#submitBtn');

        // Step 3: Verify error message is shown
        await expect(page.locator('.message.error')).toBeVisible();
        await expect(page.locator('.message.error')).toContainText('already exists');

        // Step 4: Validate backend - Verify only one user exists with original email
        const response = await request.get(`/api/users/username/${testUser.username}`);
        expect(response.status()).toBe(200);

        const responseBody = await response.json();
        expect(responseBody.user.email).toBe(testUser.email); // Original email
    });

    test('should validate age validation on both frontend and backend', async ({ page, request }) => {
        const testUser = {
            username: `testuser_${Date.now()}`,
            email: `test_${Date.now()}@example.com`,
            age: 200 // Invalid age
        };

        // Step 1: Fill form and bypass HTML5 validation
        await page.fill('#username', testUser.username);
        await page.fill('#email', testUser.email);

        // Use evaluate to bypass HTML5 validation
        await page.evaluate((age) => {
            document.querySelector('#age').value = age;
        }, testUser.age);

        await page.click('#submitBtn');

        // Step 2: Verify error message from backend
        await expect(page.locator('.message.error')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.message.error')).toContainText('Age must be between');

        // Step 3: Validate backend - User should NOT exist
        const response = await request.get(`/api/users/username/${testUser.username}`);
        expect(response.status()).toBe(404);

        const responseBody = await response.json();
        expect(responseBody.success).toBe(false);
    });
});
