document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');
    const darkIcon = themeToggle.querySelector('.dark-icon');
    const lightIcon = themeToggle.querySelector('.light-icon');
    const modeText = themeToggle.querySelector('.mode-text');
    
    // Apply transition class after page loads to prevent transition on initial load
    setTimeout(() => {
        document.body.classList.add('transitions-enabled');
    }, 300);
    
    // Check for saved theme preference or use user's system preference
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const currentTheme = localStorage.getItem('theme');
    
    if (currentTheme === 'dark' || (!currentTheme && prefersDarkScheme.matches)) {
        document.body.classList.add('dark-mode');
        darkIcon.classList.add('d-none');
        lightIcon.classList.remove('d-none');
        modeText.textContent = 'Light Mode';
    }
    
    // Toggle theme when button is clicked
    themeToggle.addEventListener('click', function() {
        // Add a small animation to the toggle button
        themeToggle.classList.add('animate-toggle');
        setTimeout(() => {
            themeToggle.classList.remove('animate-toggle');
        }, 300);
        
        document.body.classList.toggle('dark-mode');
        
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            darkIcon.classList.add('d-none');
            lightIcon.classList.remove('d-none');
            modeText.textContent = 'Light Mode';
        } else {
            localStorage.setItem('theme', 'light');
            darkIcon.classList.remove('d-none');
            lightIcon.classList.add('d-none');
            modeText.textContent = 'Dark Mode';
        }
    });
    
    // Listen for system preference changes
    prefersDarkScheme.addEventListener('change', function(e) {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                document.body.classList.add('dark-mode');
                darkIcon.classList.add('d-none');
                lightIcon.classList.remove('d-none');
                modeText.textContent = 'Light Mode';
            } else {
                document.body.classList.remove('dark-mode');
                darkIcon.classList.remove('d-none');
                lightIcon.classList.add('d-none');
                modeText.textContent = 'Dark Mode';
            }
        }
    });
});
