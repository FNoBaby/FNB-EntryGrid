document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');
    const modeText = themeToggle.querySelector('.mode-text');
    
    // Check for saved theme preference or set based on system preference
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-mode');
        modeText.textContent = 'Light Mode';
    }
    
    // Toggle theme
    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            modeText.textContent = 'Light Mode';
        } else {
            localStorage.setItem('theme', 'light');
            modeText.textContent = 'Dark Mode';
        }
    });
});
