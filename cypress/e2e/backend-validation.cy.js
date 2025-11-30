/**
 * Backend Validation Example - Cypress E2E Test
 * 
 * This test demonstrates how to validate backend data after performing UI actions.
 * 
 * Test Flow:
 * 1. Perform UI action (fill form and submit)
 * 2. Verify UI feedback (success message)
 * 3. Validate backend data using API request
 * 4. Clean up test data
 */

describe('Backend Data Validation After UI Actions', () => {
    const testUser = {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        age: 25
    };

    let createdUserId;

    beforeEach(() => {
        // Visit the application
        cy.visit('/');
    });

    afterEach(() => {
        // Clean up: Delete the created user from database
        if (createdUserId) {
            cy.request('DELETE', `/api/users/${createdUserId}`);
        }
    });

    it('should validate user data in backend after successful registration', () => {
        // Step 1: Perform UI Action - Fill and submit the registration form
        cy.get('#username').type(testUser.username);
        cy.get('#email').type(testUser.email);
        cy.get('#age').type(testUser.age.toString());
        cy.get('#submitBtn').click();

        // Step 2: Verify UI Feedback - Check success message is displayed
        cy.get('#userInfo').should('be.visible');
        cy.get('#displayUsername').should('contain.text', testUser.username);
        cy.get('#displayEmail').should('contain.text', testUser.email);
        cy.get('#displayAge').should('contain.text', testUser.age.toString());

        // Get the user ID from the UI
        cy.get('#userId').invoke('text').then((userId) => {
            createdUserId = parseInt(userId);

            // Step 3: Validate Backend Data - Verify data was saved correctly in database
            cy.request('GET', `/api/users/${createdUserId}`).then((response) => {
                // Verify response status
                expect(response.status).to.eq(200);
                expect(response.body.success).to.be.true;

                // Verify user data in backend matches what was submitted
                const backendUser = response.body.user;
                expect(backendUser.id).to.eq(createdUserId);
                expect(backendUser.username).to.eq(testUser.username);
                expect(backendUser.email).to.eq(testUser.email);
                expect(backendUser.age).to.eq(testUser.age);
                expect(backendUser.created_at).to.exist;
            });
        });
    });

    it('should validate user can be retrieved by username from backend', () => {
        // Step 1: Create user via UI
        cy.get('#username').type(testUser.username);
        cy.get('#email').type(testUser.email);
        cy.get('#age').type(testUser.age.toString());
        cy.get('#submitBtn').click();

        // Wait for success
        cy.get('#userInfo').should('be.visible');
        cy.get('#userId').invoke('text').then((userId) => {
            createdUserId = parseInt(userId);
        });

        // Step 2: Validate backend - Fetch user by username
        cy.request('GET', `/api/users/username/${testUser.username}`).then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body.success).to.be.true;
            expect(response.body.user.username).to.eq(testUser.username);
            expect(response.body.user.email).to.eq(testUser.email);
        });
    });

    it('should validate user appears in all users list', () => {
        // Step 1: Create user via UI
        cy.get('#username').type(testUser.username);
        cy.get('#email').type(testUser.email);
        cy.get('#age').type(testUser.age.toString());
        cy.get('#submitBtn').click();

        cy.get('#userInfo').should('be.visible');
        cy.get('#userId').invoke('text').then((userId) => {
            createdUserId = parseInt(userId);

            // Step 2: Validate backend - Check user exists in all users list
            cy.request('GET', '/api/users').then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body.success).to.be.true;

                // Find our user in the list
                const users = response.body.users;
                const ourUser = users.find(u => u.id === createdUserId);

                expect(ourUser).to.exist;
                expect(ourUser.username).to.eq(testUser.username);
                expect(ourUser.email).to.eq(testUser.email);
                expect(ourUser.age).to.eq(testUser.age);
            });
        });
    });

    it('should handle duplicate username error correctly', () => {
        // Step 1: Create first user
        cy.get('#username').type(testUser.username);
        cy.get('#email').type(testUser.email);
        cy.get('#age').type(testUser.age.toString());
        cy.get('#submitBtn').click();

        cy.get('#userInfo').should('be.visible');
        cy.get('#userId').invoke('text').then((userId) => {
            createdUserId = parseInt(userId);
        });

        // Step 2: Try to create another user with same username
        cy.get('#registerAnother').click();
        cy.get('#username').type(testUser.username);
        cy.get('#email').type(`different_${testUser.email}`);
        cy.get('#age').type('30');
        cy.get('#submitBtn').click();

        // Step 3: Verify error message is shown
        cy.get('.message.error').should('be.visible');
        cy.get('.message.error').should('contain.text', 'already exists');

        // Step 4: Validate backend - Verify only one user exists
        cy.request('GET', `/api/users/username/${testUser.username}`).then((response) => {
            expect(response.status).to.eq(200);
            // Original email should still be there
            expect(response.body.user.email).to.eq(testUser.email);
        });
    });

    it('should validate age validation on both frontend and backend', () => {
        const invalidAge = 200;

        // Step 1: Fill form fields
        cy.get('#username').type(testUser.username);
        cy.get('#email').type(testUser.email);

        // Step 2: Remove HTML5 max validation and set invalid age
        cy.get('#age').invoke('removeAttr', 'max').type(invalidAge.toString());
        cy.get('#submitBtn').click();

        // Step 3: Verify error message from backend
        cy.get('.message.error', { timeout: 5000 }).should('be.visible');
        cy.get('.message.error').should('contain.text', 'Age must be between');

        // Step 4: Validate backend - User should NOT exist
        cy.request({
            url: `/api/users/username/${testUser.username}`,
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(404);
            expect(response.body.success).to.be.false;
        });
    });
});
