document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('quick-search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        
        // Get all card elements using the new card-wrapper class
        const cards = document.querySelectorAll('.card-wrapper');
        const sections = document.querySelectorAll('[data-section-id]');
        let anyVisible = false;
        
        // Check if search is active (has content)
        const isSearchActive = searchTerm.length > 0;
        
        // Loop through each card and check if it matches the search
        cards.forEach(card => {
            const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
            const description = card.querySelector('.card-text')?.textContent.toLowerCase() || '';
            const isMatch = title.includes(searchTerm) || description.includes(searchTerm);
            
            // Toggle visibility
            if (isMatch || !isSearchActive) {
                card.classList.remove('search-hidden');
                anyVisible = true;
            } else {
                card.classList.add('search-hidden');
            }
        });
        
        // ...existing code for handling sections and no results message...
    });
    
    // ...existing code for ESC key and other features...
    
    const cards = document.querySelectorAll('.card');
    const cardContainers = document.querySelectorAll('.col-md-5');
    const cardRows = document.querySelectorAll('.row');
    
    // Add a "no results" message to each row
    cardRows.forEach(row => {
        if (!row.querySelector('.no-results-message')) {
            const noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'no-results-message';
            noResultsMsg.textContent = 'No matching services found';
            row.appendChild(noResultsMsg);
        }
    });
    
    // Debounce function to limit how often search is processed
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
    
    // Filter function
    const filterCards = debounce(function(searchTerm) {
        // Add search-active class to rows when searching
        cardRows.forEach(row => {
            if (searchTerm) {
                row.classList.add('search-active');
            } else {
                row.classList.remove('search-active');
            }
            
            // Reset no results message
            const noResultsMsg = row.querySelector('.no-results-message');
            noResultsMsg.style.display = 'none';
            noResultsMsg.classList.remove('visible');
        });
        
        // Group cards by their parent row
        const rowsMap = new Map();
        cardContainers.forEach(container => {
            const row = container.closest('.row');
            if (!rowsMap.has(row)) {
                rowsMap.set(row, []);
            }
            rowsMap.get(row).push(container);
        });
        
        // Process each card
        let matchesInRow = new Map();
        cardContainers.forEach(container => {
            const card = container.querySelector('.card');
            const title = card.querySelector('.card-title').textContent.toLowerCase();
            const description = card.querySelector('.card-text').textContent.toLowerCase();
            const row = container.closest('.row');
            
            // Initialize row in matches map if needed
            if (!matchesInRow.has(row)) {
                matchesInRow.set(row, 0);
            }
            
            // Check if card matches search
            if (!searchTerm || title.includes(searchTerm) || description.includes(searchTerm)) {
                container.classList.remove('search-hidden');
                matchesInRow.set(row, matchesInRow.get(row) + 1);
            } else {
                container.classList.add('search-hidden');
            }
        });
        
        // Show "no results" message if needed with delay
        setTimeout(() => {
            matchesInRow.forEach((matches, row) => {
                const noResultsMsg = row.querySelector('.no-results-message');
                if (searchTerm && matches === 0) {
                    noResultsMsg.style.display = 'block';
                    // Trigger animation after display is set
                    setTimeout(() => {
                        noResultsMsg.classList.add('visible');
                    }, 10);
                } else {
                    noResultsMsg.classList.remove('visible');
                    setTimeout(() => {
                        if (!noResultsMsg.classList.contains('visible')) {
                            noResultsMsg.style.display = 'none';
                        }
                    }, 400); // Match the CSS transition duration
                }
            });
        }, 300); // Delay to allow card animations to complete
    }, 200); // Debounce time in ms
    
    // Search input event
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        filterCards(searchTerm);
    });
    
    // Add clear search button functionality
    searchInput.addEventListener('keyup', function(e) {
        // Clear on Escape key
        if (e.key === 'Escape') {
            this.value = '';
            filterCards('');
        }
    });
    
    // Add animated placeholder text
    const placeholders = [
        'Search services...',
        'Type to filter...',
        'Find by name...',
        'Search by function...'
    ];
    
    let placeholderIndex = 0;
    if (searchInput) {
        setInterval(() => {
            searchInput.setAttribute('placeholder', placeholders[placeholderIndex] + ' (ESC to clear)');
            placeholderIndex = (placeholderIndex + 1) % placeholders.length;
        }, 3000);
    }

    // Check for theme toggle and add event listener
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            // Detect if document has 'dark-mode' class after toggle
            setTimeout(() => {
                const isDarkMode = document.body.classList.contains('dark-mode');
                localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
            }, 50);
        });
    }
});
