document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const loginButton = document.getElementById('login-button');
    const loginSpinner = document.getElementById('login-spinner');
    const loginText = document.getElementById('login-text');
    const togglePassword = document.querySelector('.toggle-password');
    const passwordField = document.getElementById('password');
    
    // Toggle password visibility
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordField.setAttribute('type', type);
            
            // Toggle eye icon
            const icon = this.querySelector('i');
            icon.classList.toggle('bi-eye');
            icon.classList.toggle('bi-eye-slash');
        });
    }
    
    // Handle form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Show loading state
            loginButton.disabled = true;
            loginSpinner.classList.remove('d-none');
            loginText.textContent = 'Signing in...';
            loginError.classList.add('d-none');
            
            const formData = new FormData(loginForm);
            const username = formData.get('username');
            const password = formData.get('password');
            
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    window.location.href = data.redirect || '/';
                } else {
                    // Show error message
                    loginError.textContent = data.message || 'Invalid username or password';
                    loginError.classList.remove('d-none');
                    
                    // Reset button state
                    loginButton.disabled = false;
                    loginSpinner.classList.add('d-none');
                    loginText.textContent = 'Sign In';
                }
            } catch (error) {
                // Show error message
                loginError.textContent = 'An error occurred. Please try again.';
                loginError.classList.remove('d-none');
                
                // Reset button state
                loginButton.disabled = false;
                loginSpinner.classList.add('d-none');
                loginText.textContent = 'Sign In';
                
                console.error('Login error:', error);
            }
        });
    }
});
