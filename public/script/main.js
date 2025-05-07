document.addEventListener('DOMContentLoaded', function() {
    // Fetch logged-in user information
    async function fetchUserInfo() {
        try {
            const response = await fetch('/api/user');
            if (response.ok) {
                const data = await response.json();
                console.log('Fetched user info:', data);
                
                if (data.user) {
                    const displayName = data.user.name || data.user.username;
                    const initial = displayName.charAt(0).toUpperCase();
                    
                    // Update user name in the navbar dropdown
                    const userNameElements = [
                        document.getElementById('nav-user-name'),
                        document.getElementById('user-name')
                    ];
                    
                    userNameElements.forEach(element => {
                        if (element) {
                            element.textContent = displayName;
                            console.log('Updated element with name:', element.id);
                        }
                    });
                    
                    // Update avatar initial
                    const avatarInitial = document.getElementById('avatar-initial');
                    if (avatarInitial) {
                        avatarInitial.textContent = initial;
                        console.log('Updated avatar initial to:', initial);
                    }
                    
                    // Show admin links if user is an admin
                    if (data.user.role === 'admin') {
                        // Nav item in the navbar
                        const adminNavItem = document.getElementById('admin-nav-item');
                        if (adminNavItem) {
                            adminNavItem.classList.remove('d-none');
                            console.log('Made admin nav visible');
                        }
                        
                        // Legacy admin link container
                        const adminLinkContainer = document.getElementById('admin-link-container');
                        if (adminLinkContainer) {
                            adminLinkContainer.classList.remove('d-none');
                        }
                    }
                }
            } else {
                console.error('Failed to fetch user info. Status:', response.status);
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    }
    
    // Fetch user info when page loads
    fetchUserInfo();
    
    // Add active class to the current page in navbar
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (currentPath === href || 
            (href !== '/' && currentPath.startsWith(href))) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        } else {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        }
    });
});
