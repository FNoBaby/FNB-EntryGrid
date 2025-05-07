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
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                // Check if the response is JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Received non-JSON response from server');
                }
                
                const data = await response.json();
                
                if (data.success) {
                    // Redirect to the dashboard or specified route
                    window.location.href = data.redirect || '/';
                } else {
                    // Handle different error cases
                    loginError.classList.remove('d-none');
                    
                    // Check for inactive account message
                    if (data.message && data.message.includes('inactive')) {
                        // Add appropriate styling for inactive account errors
                        loginError.className = 'alert alert-warning';
                        loginError.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i>' + 
                                              'This account has been deactivated. Please contact an administrator.';
                    } else {
                        // Default error styling
                        loginError.className = 'alert alert-danger';
                        loginError.innerHTML = '<i class="bi bi-x-circle-fill me-2"></i>' + 
                                              (data.message || 'Invalid username or password');
                    }
                    
                    // Reset button state
                    loginButton.disabled = false;
                    loginSpinner.classList.add('d-none');
                    loginText.textContent = 'Sign In';
                }
            } catch (error) {
                console.error('Login error:', error);
                
                // Show error message
                loginError.className = 'alert alert-danger';
                loginError.innerHTML = '<i class="bi bi-exclamation-circle-fill me-2"></i>' + 
                                      'An error occurred during login. Please try again.';
                loginError.classList.remove('d-none');
                
                // Reset button state
                loginButton.disabled = false;
                loginSpinner.classList.add('d-none');
                loginText.textContent = 'Sign In';
            }
        });
    }
});
