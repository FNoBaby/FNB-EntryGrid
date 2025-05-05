// Immediately apply dark mode if previously selected
(function() {
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }
})();
