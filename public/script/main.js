document.addEventListener('DOMContentLoaded', function() {
    // Fetch logged-in user information
    async function fetchUserInfo() {
        try {
            const response = await fetch('/api/user');
            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    // Update user name in the welcome message
                    const userNameElement = document.getElementById('user-name');
                    if (userNameElement) {
                        userNameElement.textContent = data.user.name || data.user.username;
                    }
                    
                    // Show admin link if user is an admin
                    if (data.user.role === 'admin') {
                        const adminLinkContainer = document.getElementById('admin-link-container');
                        if (adminLinkContainer) {
                            adminLinkContainer.classList.remove('d-none');
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    }
    
    // Fetch user info when page loads
    fetchUserInfo();
});
