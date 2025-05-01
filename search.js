document.addEventListener('DOMContentLoaded', function() {
    // Quick search functionality
    const searchInput = document.getElementById('quick-search');
    const cards = document.querySelectorAll('.card');
    
    // Set all card links to open in new tabs
    document.querySelectorAll('.card .btn').forEach(link => {
        link.setAttribute('target', '_blank');
    });
    
    searchInput.addEventListener('keyup', function() {
        const searchTerm = this.value.toLowerCase();
        
        cards.forEach(card => {
            const title = card.querySelector('.card-title').textContent.toLowerCase();
            const description = card.querySelector('.card-text').textContent.toLowerCase();
            const cardContainer = card.closest('.col-md-5');
            
            if (title.includes(searchTerm) || description.includes(searchTerm)) {
                cardContainer.style.display = '';
            } else {
                cardContainer.style.display = 'none';
            }
        });
    });
    
    // Keyboard shortcuts for navigation (press number to go to corresponding card)
    document.addEventListener('keydown', function(e) {
        // Only handle number keys 1-9
        if (e.key >= '1' && e.key <= '9' && document.activeElement !== searchInput) {
            const index = parseInt(e.key) - 1;
            const visibleCards = Array.from(cards).filter(card => 
                card.closest('.col-md-5').style.display !== 'none'
            );
            
            if (visibleCards[index]) {
                const link = visibleCards[index].querySelector('.btn');
                if (link) {
                    // Open in new tab when using keyboard shortcut
                    window.open(link.href, '_blank');
                }
            }
        }
        
        // Pressing '/' focuses the search box
        if (e.key === '/' && document.activeElement !== searchInput) {
            e.preventDefault();
            searchInput.focus();
        }
        
        // Pressing Escape clears the search
        if (e.key === 'Escape' && document.activeElement === searchInput) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('keyup'));
            searchInput.blur();
        }
    });
    
    // Add number badges to cards for keyboard shortcuts
    cards.forEach((card, index) => {
        const badge = document.createElement('span');
        badge.className = 'position-absolute top-0 start-0 badge rounded-pill bg-primary m-2';
        badge.textContent = index + 1;
        badge.style.zIndex = 1;
        card.style.position = 'relative';
        card.prepend(badge);
    });
});
