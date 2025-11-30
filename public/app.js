const form = document.getElementById('registrationForm');
const messageDiv = document.getElementById('message');
const userInfoDiv = document.getElementById('userInfo');
const submitBtn = document.getElementById('submitBtn');
const registerAnotherBtn = document.getElementById('registerAnother');

// Form submission handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get form data
    const formData = {
        username: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim(),
        age: parseInt(document.getElementById('age').value)
    };

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering...';

    try {
        // Send POST request to API
        const response = await fetch('http://localhost:3001/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            // Hide form and message
            form.classList.add('hidden');
            messageDiv.classList.add('hidden');

            // Display user info
            document.getElementById('userId').textContent = data.user.id;
            document.getElementById('displayUsername').textContent = data.user.username;
            document.getElementById('displayEmail').textContent = data.user.email;
            document.getElementById('displayAge').textContent = data.user.age;
            userInfoDiv.classList.remove('hidden');
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        showMessage('Failed to register user. Please ensure the server is running.', 'error');
        console.error('Error:', error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register User';
    }
});

// Register another user handler
registerAnotherBtn.addEventListener('click', () => {
    // Reset form
    form.reset();

    // Show form, hide user info
    form.classList.remove('hidden');
    userInfoDiv.classList.add('hidden');
    messageDiv.classList.add('hidden');
});

// Helper function to show messages
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove('hidden');

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 5000);
    }
}
