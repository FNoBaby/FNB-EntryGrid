document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const darkIcon = document.querySelector('.dark-icon');
    const lightIcon = document.querySelector('.light-icon');
    const modeText = document.querySelector('.mode-text');
    const searchInput = document.getElementById('quick-search');
    const footer = document.querySelector('footer');

    // Apply transition class after page loads to prevent transition on initial load
    setTimeout(() => {
        document.body.classList.add('transitions-enabled');
    }, 300);
    
    // Check for saved theme preference or use user's system preference
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const currentTheme = localStorage.getItem('theme');
    
    if (currentTheme === 'dark' || (!currentTheme && prefersDarkScheme.matches)) {
        enableDarkMode();
    }
    
    // Toggle theme when button is clicked
    themeToggle.addEventListener('click', function() {
        // Add a small animation to the toggle button
        themeToggle.classList.add('animate-toggle');
        setTimeout(() => {
            themeToggle.classList.remove('animate-toggle');
        }, 300);
        
        if (body.classList.contains('dark-mode')) {
            disableDarkMode();
        } else {
            enableDarkMode();
        }
    });
    
    // Listen for system preference changes
    prefersDarkScheme.addEventListener('change', function(e) {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                enableDarkMode();
            } else {
                disableDarkMode();
            }
        }
    });

    function enableDarkMode() {
        body.classList.add('dark-mode');
        darkIcon.classList.add('d-none');
        lightIcon.classList.remove('d-none');
        modeText.textContent = 'Light Mode';
        localStorage.setItem('darkMode', 'enabled');
        
        // Update search input for dark mode
        if (searchInput) {
            searchInput.classList.add('dark-search');
        }
        
        // Update footer for dark mode
        if (footer) {
            footer.classList.add('dark-footer');
        }
    }

    function disableDarkMode() {
        body.classList.remove('dark-mode');
        darkIcon.classList.remove('d-none');
        lightIcon.classList.add('d-none');
        modeText.textContent = 'Dark Mode';
        localStorage.setItem('darkMode', 'disabled');
        
        // Update search input for light mode
        if (searchInput) {
            searchInput.classList.remove('dark-search');
        }
        
        // Update footer for light mode
        if (footer) {
            footer.classList.remove('dark-footer');
        }
    }
});
