document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');
    const darkIcon = themeToggle.querySelector('.dark-icon');
    const lightIcon = themeToggle.querySelector('.light-icon');
    const modeText = themeToggle.querySelector('.mode-text');
    
    // Check for saved theme preference or set based on system preference
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setTheme(true);
    } else {
        setTheme(false);
    }
    
    // Toggle theme
    themeToggle.addEventListener('click', function() {
        const isDarkNow = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        setTheme(!isDarkNow);
    });
    
    // Function to set theme
    function setTheme(isDark) {
        if (isDark) {
            // Apply dark theme
            document.documentElement.setAttribute('data-bs-theme', 'dark');
            darkIcon.classList.add('d-none');
            lightIcon.classList.remove('d-none');
            modeText.textContent = 'Light Mode';
            localStorage.setItem('theme', 'dark');
        } else {
            // Apply light theme
            document.documentElement.setAttribute('data-bs-theme', 'light');
            darkIcon.classList.remove('d-none');
            lightIcon.classList.add('d-none');
            modeText.textContent = 'Dark Mode';
            localStorage.setItem('theme', 'light');
        }
        
        // Update modal backdrop color if any modals are open
        updateModalBackdrops();
    }

    // Function to update modal backdrops based on current theme
    function updateModalBackdrops() {
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            if (isDark) {
                backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';  // Darker for dark mode
            } else {
                backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';  // Default for light mode
            }
        });
    }

    // Add an event listener for when modals are opened
    document.addEventListener('shown.bs.modal', updateModalBackdrops);
});
