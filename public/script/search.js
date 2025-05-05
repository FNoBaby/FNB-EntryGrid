document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('quick-search');
    const cards = document.querySelectorAll('.card');
    const cardContainers = document.querySelectorAll('.col-md-5');
    const cardRows = document.querySelectorAll('.row');
    
    // Add a "no results" message to each row
    cardRows.forEach(row => {
        const noResultsMsg = document.createElement('div');
        noResultsMsg.className = 'no-results-message';
        noResultsMsg.textContent = 'No matching services found';
        row.appendChild(noResultsMsg);
    });
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        
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
        
        // Show "no results" message if needed
        matchesInRow.forEach((matches, row) => {
            const noResultsMsg = row.querySelector('.no-results-message');
            if (searchTerm && matches === 0) {
                noResultsMsg.style.display = 'block';
            } else {
                noResultsMsg.style.display = 'none';
            }
        });
    });
    
    // Add clear search button functionality
    searchInput.addEventListener('keyup', function(e) {
        // Clear on Escape key
        if (e.key === 'Escape') {
            this.value = '';
            this.dispatchEvent(new Event('input'));
        }
    });
});
