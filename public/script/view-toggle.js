/**
 * View Toggle - Handles switching between grid and list views
 */
document.addEventListener('DOMContentLoaded', function() {
    // Get the view toggle buttons
    const viewToggleBtns = document.querySelectorAll('.view-toggle-btn');
    const sectionsContainer = document.getElementById('sections-container');
    
    // Load saved view preference from localStorage
    const savedView = localStorage.getItem('viewMode') || 'grid';
    
    // Apply saved view class to the container
    if (savedView === 'list') {
        applyListView();
    }
    
    // Update button active states
    updateActiveButton(savedView);
    
    // Add click event listeners to the view toggle buttons
    viewToggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const viewMode = this.dataset.view;
            
            // Update active button state
            updateActiveButton(viewMode);
            
            // Update sections container class
            if (viewMode === 'list') {
                applyListView();
            } else {
                applyGridView();
            }
            
            // Save preference to localStorage
            localStorage.setItem('viewMode', viewMode);
        });
    });
    
    // Apply list view with proper image handling
    function applyListView() {
        sectionsContainer.classList.add('list-view');
        document.querySelectorAll('.card').forEach(card => {
            card.style.cursor = 'pointer';
        });
        
        // Reset and apply proper layout for list view
        document.querySelectorAll('.row').forEach(row => {
            row.classList.add('list-view-row');
            row.classList.remove('justify-content-center');
            row.style.width = '100%';
            row.style.maxWidth = '100%';
            row.style.margin = '0';
        });
        
        // Set correct dimensions for card containers
        document.querySelectorAll('.card-wrapper, .col-md-5, .col-lg-4, .col-md-4').forEach(wrapper => {
            wrapper.style.width = '100%';
            wrapper.style.maxWidth = '100%';
            wrapper.style.padding = '0 0.25rem';
            wrapper.style.marginBottom = '10px';
        });
        
        // Fix icon/image sizes and positioning
        document.querySelectorAll('.card-img-top, .card-img-container, .card .text-center.py-4').forEach(imgContainer => {
            // Store original height for when we switch back to grid
            if (!imgContainer.dataset.originalHeight) {
                imgContainer.dataset.originalHeight = imgContainer.style.height || '200px';
            }
            
            // Apply fixed dimensions and disable transitions
            imgContainer.style.transition = 'none';
            imgContainer.style.height = '50px';
            imgContainer.style.width = '50px';
            imgContainer.style.minWidth = '50px';
            imgContainer.style.minHeight = '50px';
            imgContainer.style.maxWidth = '50px';
            imgContainer.style.maxHeight = '50px';
            
            // Fix Bootstrap icon size
            const bootstrapIcon = imgContainer.querySelector('.bi');
            if (bootstrapIcon) {
                bootstrapIcon.style.transition = 'none';
                bootstrapIcon.style.fontSize = '1.5rem';
                bootstrapIcon.style.transform = 'none';
            }
            
            // Handle image sizing - both direct image and images inside containers
            const img = imgContainer.tagName === 'IMG' ? imgContainer : imgContainer.querySelector('img');
            if (img) {
                img.style.transition = 'none';
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.padding = '6px';
                img.style.objectFit = 'contain';
                img.style.position = 'relative';
                img.style.transform = 'none';
            }
        });
        
        // Ensure proper sequencing of elements
        document.querySelectorAll('.card-content').forEach(content => {
            const title = content.querySelector('.card-title');
            const description = content.querySelector('.card-text');
            
            if (title && description) {
                // Make sure title appears before description
                content.appendChild(title);
                content.appendChild(description);
            }
        });
    }
    
    // Ensure proper restoration of original sizing when switching back to grid
    function applyGridView() {
        sectionsContainer.classList.remove('list-view');
        document.querySelectorAll('.card').forEach(card => {
            card.style.cursor = '';
        });
        
        // Reset row layout for grid view
        document.querySelectorAll('.row').forEach(row => {
            row.classList.remove('list-view-row');
            row.classList.add('justify-content-center');
            row.style.width = '';
            row.style.maxWidth = '';
            row.style.margin = '';
        });
        
        // Reset card wrappers for grid view
        document.querySelectorAll('.card-wrapper, .col-md-5, .col-lg-4, .col-md-4').forEach(wrapper => {
            wrapper.style.width = '';
            wrapper.style.maxWidth = '';
            wrapper.style.padding = '';
            wrapper.style.marginBottom = '';
        });
        
        // Restore original image/icon container dimensions
        document.querySelectorAll('.card-img-top, .card-img-container, .card .text-center.py-4').forEach(imgContainer => {
            // Re-enable transitions
            imgContainer.style.transition = '';
            
            // Restore original height if it was saved
            if (imgContainer.dataset.originalHeight) {
                imgContainer.style.height = imgContainer.dataset.originalHeight;
                imgContainer.style.width = '';
                imgContainer.style.minWidth = '';
                imgContainer.style.minHeight = '';
                imgContainer.style.maxWidth = '';
                imgContainer.style.maxHeight = '';
            }
            
            // Restore Bootstrap icon size
            const bootstrapIcon = imgContainer.querySelector('.bi');
            if (bootstrapIcon) {
                bootstrapIcon.style.transition = '';
                bootstrapIcon.style.fontSize = '5rem';
            }
            
            // Restore image sizing
            const img = imgContainer.tagName === 'IMG' ? imgContainer : imgContainer.querySelector('img');
            if (img) {
                img.style.transition = '';
                img.style.width = '';
                img.style.height = '';
                img.style.padding = '20px';
                img.style.position = '';
                img.style.objectFit = 'contain';
            }
        });
    }
    
    // Update active button
    function updateActiveButton(viewMode) {
        viewToggleBtns.forEach(b => {
            if (b.dataset.view === viewMode) {
                b.classList.add('active');
                b.setAttribute('aria-pressed', 'true');
            } else {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            }
        });
    }
    
    // Listen for theme changes to update dropdown styles
    document.addEventListener('theme-changed', function() {
        updateDropdownStyles();
    });
    
    function updateDropdownStyles() {
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        const dropdownMenus = document.querySelectorAll('.list-dropdown-menu');
        
        dropdownMenus.forEach(menu => {
            if (isDark) {
                menu.classList.add('dropdown-menu-dark');
            } else {
                menu.classList.remove('dropdown-menu-dark');
            }
        });
    }
    
    // Initial dropdown styles update
    updateDropdownStyles();
});
