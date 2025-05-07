/**
 * Dashboard.js - Handles the dashboard UI and interactions
 */
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const sectionsContainer = document.getElementById('sections-container');
    const addSectionBtn = document.getElementById('add-section-btn');
    
    // Bootstrap modals
    const sectionModal = document.getElementById('sectionModal') ? 
                         new bootstrap.Modal(document.getElementById('sectionModal')) : null;
    const cardModal = document.getElementById('cardModal') ? 
                      new bootstrap.Modal(document.getElementById('cardModal')) : null;
    const deleteConfirmModal = document.getElementById('deleteConfirmModal') ? 
                               new bootstrap.Modal(document.getElementById('deleteConfirmModal')) : null;
    
    // Form elements
    const sectionForm = document.getElementById('section-form');
    const cardForm = document.getElementById('card-form');
    
    // Current element being deleted
    let currentDeleteTarget = { type: null, id: null, name: null };
    
    // Debug flag
    const DEBUG = window.DEBUG || false;
    
    // Initialize the page
    init();
    
    function init() {
        // Load sections and cards
        loadSections();
        
        // Set up event listeners
        setupEventListeners();
        
        // Make loadSections available globally for other scripts
        window.loadSections = loadSections;
        
        // Make showNotification available globally
        window.showNotification = showNotification;
    }
    
    function setupEventListeners() {
        // Add section button
        if (addSectionBtn) {
            addSectionBtn.addEventListener('click', () => {
                resetSectionForm();
                if (sectionModal) sectionModal.show();
            });
        }
        
        // Delete confirmation
        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                if (currentDeleteTarget.type === 'section') {
                    deleteSection(currentDeleteTarget.id);
                } else if (currentDeleteTarget.type === 'card') {
                    deleteCard(currentDeleteTarget.id);
                }
            });
        }
    }
    
    // AJAX Functions
    
    // Load all sections and their cards
    async function loadSections() {
        try {
            if (DEBUG) console.log('Loading sections from API...');
            if (!sectionsContainer) {
                console.error('Sections container not found in DOM.');
                return;
            }
            
            // Show loading indicator
            sectionsContainer.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3">Loading dashboard...</p>
                </div>
            `;
            
            const response = await fetch('/api/sections');
            
            // Check if the response is OK
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response from sections API:', response.status, errorText);
                throw new Error(`Server returned ${response.status}: ${errorText}`);
            }
            
            const sections = await response.json();
            if (DEBUG) console.log(`Loaded ${sections.length} sections from API`);
            
            // Clear container
            sectionsContainer.innerHTML = '';
            
            if (sections.length === 0) {
                if (DEBUG) console.warn('No sections returned from API');
                sectionsContainer.innerHTML = `
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle-fill me-2"></i>
                        No sections found. Click the "Add New Section" button to create one.
                    </div>
                `;
                return;
            }
            
            // Update section dropdown in card form
            updateSectionDropdown(sections);
            
            // Render each section
            for (const section of sections) {
                if (DEBUG) console.log(`Rendering section: ${section.id} - ${section.title}`);
                await renderSection(section);
            }
            
        } catch (error) {
            console.error('Error loading sections:', error);
            showNotification('error', 'Failed to load sections: ' + error.message);
            
            if (sectionsContainer) {
                sectionsContainer.innerHTML = `
                    <div class="alert alert-danger m-3">
                        <h4 class="alert-heading"><i class="bi bi-exclamation-triangle-fill me-2"></i>Error Loading Dashboard</h4>
                        <p>There was a problem loading the dashboard content.</p>
                        <hr>
                        <p class="mb-0">Error details: ${error.message}</p>
                        <button class="btn btn-outline-danger mt-3" onclick="window.location.reload()">
                            <i class="bi bi-arrow-clockwise me-2"></i>Try Again
                        </button>
                    </div>
                `;
            }
        }
    }
    
    // Render a single section with its cards
    async function renderSection(section) {
        if (!sectionsContainer) return;
        
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'mb-4';
        sectionDiv.id = `section-${section.id}`;
        
        // Create section header with centered heading
        sectionDiv.innerHTML = `
            <div class="section-header mb-3">
                <h2 class="text-center w-100">${section.title}</h2>
                <div class="section-controls">
                    <button class="btn btn-sm btn-primary add-card-btn" data-section-id="${section.id}">
                        <i class="bi bi-plus-lg me-1"></i> Add Card
                    </button>
                    <button class="btn btn-sm btn-secondary edit-section-btn" data-section-id="${section.id}" data-section-title="${section.title}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-section-btn" data-section-id="${section.id}" data-section-title="${section.title}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <div class="row justify-content-center" id="cards-${section.id}">
                <div class="col-12 text-center py-3">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Loading cards...</span>
                    </div>
                    <span class="ms-2">Loading cards...</span>
                </div>
            </div>
        `;
        
        sectionsContainer.appendChild(sectionDiv);
        
        // Add event listeners to section buttons
        const addCardBtn = sectionDiv.querySelector('.add-card-btn');
        if (addCardBtn) {
            addCardBtn.addEventListener('click', function() {
                openAddCardModal(this.getAttribute('data-section-id'));
            });
        }
        
        const editSectionBtn = sectionDiv.querySelector('.edit-section-btn');
        if (editSectionBtn) {
            editSectionBtn.addEventListener('click', function() {
                openEditSectionModal(
                    this.getAttribute('data-section-id'),
                    this.getAttribute('data-section-title')
                );
            });
        }
        
        const deleteSectionBtn = sectionDiv.querySelector('.delete-section-btn');
        if (deleteSectionBtn) {
            deleteSectionBtn.addEventListener('click', function() {
                confirmDelete(
                    'section',
                    this.getAttribute('data-section-id'),
                    this.getAttribute('data-section-title')
                );
            });
        }
        
        // Load cards for this section
        loadCardsForSection(section.id);
    }
    
    // Load cards for a specific section
    async function loadCardsForSection(sectionId) {
        const cardsContainer = document.getElementById(`cards-${sectionId}`);
        if (!cardsContainer) return;
        
        try {
            const response = await fetch(`/api/cards?sectionId=${sectionId}`);
            if (!response.ok) throw new Error('Failed to load cards');
            
            const cards = await response.json();
            
            // Clear container
            cardsContainer.innerHTML = '';
            
            if (cards.length === 0) {
                cardsContainer.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-light text-center">
                            <i class="bi bi-info-circle me-2"></i>
                            No cards in this section. Use the "Add Card" button to create one.
                        </div>
                    </div>
                `;
                return;
            }
            
            // Render each card
            cards.forEach(card => renderCard(card, cardsContainer));
            
        } catch (error) {
            console.error(`Error loading cards for section ${sectionId}:`, error);
            cardsContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Error loading cards: ${error.message}
                    </div>
                </div>
            `;
        }
    }
    
    // Render a single card
    function renderCard(card, container) {
        const cardCol = document.createElement('div');
        cardCol.className = 'col-md-4 mb-4';
        cardCol.id = `card-${card.id}`;
        
        // Create icon HTML based on icon type
        let iconHtml = '';
        if (card.iconType === 'image' && card.imageUrl) {
            iconHtml = `<img src="${card.imageUrl}" alt="${card.title}" class="card-img-top">`;
        } else if (card.iconType === 'bootstrap' && card.bootstrapIcon) {
            const iconColor = card.iconColor || '#0d6efd'; // Use stored color or default blue
            iconHtml = `<div class="card-img-container">
                <i class="bi ${card.bootstrapIcon}" style="font-size: 5rem; color: ${iconColor}"></i>
            </div>`;
        }
        
        cardCol.innerHTML = `
            <div class="card h-100 clickable-card" data-url="${card.url}">
                ${iconHtml}
                <div class="card-body">
                    <h5 class="card-title">${card.title}</h5>
                    <p class="card-text">${card.description}</p>
                </div>
                <div class="card-footer bg-transparent d-flex justify-content-between align-items-center">
                    <a href="${card.url}" class="btn btn-primary card-btn" target="_blank">
                        Open <i class="bi ${card.buttonIcon || 'bi-box-arrow-up-right'} ms-1"></i>
                    </a>
                    <div class="card-actions">
                        <button class="btn btn-sm btn-secondary edit-card-btn" data-card-id="${card.id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-card-btn" data-card-id="${card.id}" data-card-title="${card.title}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(cardCol);
        
        // Add click event to the whole card
        const clickableCard = cardCol.querySelector('.clickable-card');
        if (clickableCard) {
            clickableCard.addEventListener('click', function(e) {
                // Check if click was on a button or link (don't trigger card click for those)
                if (!e.target.closest('.card-actions') && 
                    !e.target.closest('.card-btn') && 
                    !e.target.closest('.edit-card-btn') && 
                    !e.target.closest('.delete-card-btn')) {
                    window.open(this.dataset.url, '_blank');
                }
            });
        }
        
        // Add event listeners for card buttons
        const editCardBtn = cardCol.querySelector('.edit-card-btn');
        if (editCardBtn) {
            editCardBtn.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent card click
                const cardId = this.getAttribute('data-card-id');
                openEditCardModal(cardId);
            });
        }
        
        const deleteCardBtn = cardCol.querySelector('.delete-card-btn');
        if (deleteCardBtn) {
            deleteCardBtn.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent card click
                const cardId = this.getAttribute('data-card-id');
                const cardTitle = this.getAttribute('data-card-title');
                confirmDelete('card', cardId, cardTitle);
            });
        }
    }
    
    // Delete a section
    async function deleteSection(sectionId) {
        try {
            const response = await fetch(`/api/sections/${sectionId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete section');
            }
            
            // Hide modal
            if (deleteConfirmModal) deleteConfirmModal.hide();
            
            // Remove section from DOM
            const sectionElement = document.getElementById(`section-${sectionId}`);
            if (sectionElement) {
                sectionElement.remove();
            }
            
            showNotification('success', 'Section deleted successfully');
            
            // Check if there are any sections left
            if (sectionsContainer && sectionsContainer.children.length === 0) {
                sectionsContainer.innerHTML = `
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle-fill me-2"></i>
                        No sections found. Click the "Add New Section" button to create one.
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Error deleting section:', error);
            showNotification('error', 'Failed to delete section: ' + error.message);
        }
    }
    
    // Delete a card
    async function deleteCard(cardId) {
        try {
            const response = await fetch(`/api/cards/${cardId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete card');
            }
            
            // Hide modal
            if (deleteConfirmModal) deleteConfirmModal.hide();
            
            // Remove card from DOM
            const cardElement = document.getElementById(`card-${cardId}`);
            if (cardElement) {
                const sectionId = cardElement.closest('.row').id.replace('cards-', '');
                cardElement.remove();
                
                // Check if this was the last card in the section
                const cardsContainer = document.getElementById(`cards-${sectionId}`);
                if (cardsContainer && cardsContainer.children.length === 0) {
                    cardsContainer.innerHTML = `
                        <div class="col-12">
                            <div class="alert alert-light text-center">
                                <i class="bi bi-info-circle me-2"></i>
                                No cards in this section. Use the "Add Card" button to create one.
                            </div>
                        </div>
                    `;
                }
            }
            
            showNotification('success', 'Card deleted successfully');
            
        } catch (error) {
            console.error('Error deleting card:', error);
            showNotification('error', 'Failed to delete card: ' + error.message);
        }
    }
    
    // Modal Functions
    
    // Open add card modal
    function openAddCardModal(sectionId) {
        resetCardForm();
        
        // Set the section ID
        const cardSectionInput = document.getElementById('card-section');
        if (cardSectionInput) {
            cardSectionInput.value = sectionId;
        }
        
        // Update modal title
        const modalTitle = document.getElementById('cardModalLabel');
        if (modalTitle) {
            modalTitle.textContent = 'Add New Card';
        }
        
        // Show modal
        if (cardModal) cardModal.show();
    }
    
    // Open edit card modal
    async function openEditCardModal(cardId) {
        try {
            // Show loading state
            const saveBtn = document.getElementById('save-card-btn');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
            }
            
            resetCardForm();
            
            // Fetch card data
            const response = await fetch(`/api/cards/${cardId}`);
            if (!response.ok) throw new Error('Failed to load card data');
            
            const card = await response.json();
            
            // Populate form
            const cardForm = document.getElementById('card-form');
            if (cardForm) {
                document.getElementById('card-id').value = card.id;
                document.getElementById('card-section').value = card.sectionId;
                document.getElementById('card-title').value = card.title;
                document.getElementById('card-description').value = card.description;
                document.getElementById('card-url').value = card.url;
                document.getElementById('card-icon-type').value = card.iconType;
                
                if (card.iconType === 'image') {
                    document.getElementById('card-image-url').value = card.imageUrl || '';
                } else if (card.iconType === 'bootstrap') {
                    document.getElementById('card-bootstrap-icon').value = card.bootstrapIcon || '';
                    
                    // Set icon color
                    const colorPicker = document.getElementById('card-icon-color');
                    const colorHex = document.getElementById('card-icon-color-hex');
                    const iconPreview = document.getElementById('bootstrap-icon-preview');
                    
                    const iconColor = card.iconColor || '#0d6efd';
                    if (colorPicker) colorPicker.value = iconColor;
                    if (colorHex) colorHex.value = iconColor;
                    if (iconPreview) {
                        iconPreview.className = 'bi ' + (card.bootstrapIcon || 'bi-box');
                        iconPreview.style.color = iconColor;
                    }
                }
                
                document.getElementById('card-button-icon').value = card.buttonIcon || '';
                
                if (document.getElementById('card-order')) {
                    document.getElementById('card-order').value = card.order || 1;
                }
                
                // Update icon inputs visibility
                const iconTypeSelect = document.getElementById('card-icon-type');
                if (iconTypeSelect) {
                    const event = new Event('change');
                    iconTypeSelect.dispatchEvent(event);
                }
            }
            
            // Update modal title
            const modalTitle = document.getElementById('cardModalLabel');
            if (modalTitle) {
                modalTitle.textContent = 'Edit Card';
            }
            
            // Re-enable save button
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';
            }
            
            // Show modal
            if (cardModal) cardModal.show();
            
        } catch (error) {
            console.error('Error loading card for editing:', error);
            showNotification('error', 'Failed to load card data: ' + error.message);
        }
    }
    
    // Open edit section modal
    function openEditSectionModal(sectionId, sectionTitle) {
        const sectionIdInput = document.getElementById('section-id');
        const sectionTitleInput = document.getElementById('section-title');
        
        if (sectionIdInput && sectionTitleInput) {
            sectionIdInput.value = sectionId;
            sectionTitleInput.value = sectionTitle;
        }
        
        // Update modal title
        const modalTitle = document.getElementById('sectionModalLabel');
        if (modalTitle) {
            modalTitle.textContent = 'Edit Section';
        }
        
        // Show modal
        if (sectionModal) sectionModal.show();
    }
    
    // Confirm delete action
    function confirmDelete(type, id, name) {
        currentDeleteTarget = { type, id, name };
        
        // Update confirmation modal content
        const confirmMessage = document.getElementById('delete-confirm-message');
        if (confirmMessage) {
            confirmMessage.textContent = `Are you sure you want to delete this ${type}: "${name}"?`;
        }
        
        // Set warning message if deleting a section
        const warningMsg = document.getElementById('delete-warning-message');
        const warningText = document.getElementById('delete-warning-text');
        
        if (warningMsg && warningText) {
            if (type === 'section') {
                warningMsg.classList.remove('d-none');
                warningText.textContent = 'Deleting this section will also delete all cards it contains!';
            } else {
                warningMsg.classList.add('d-none');
            }
        }
        
        // Show modal
        if (deleteConfirmModal) deleteConfirmModal.show();
    }
    
    // Helper Functions
    
    // Reset the section form
    function resetSectionForm() {
        const sectionIdInput = document.getElementById('section-id');
        const sectionTitleInput = document.getElementById('section-title');
        const sectionOrderInput = document.getElementById('section-order');
        
        if (sectionIdInput && sectionTitleInput) {
            sectionIdInput.value = '';
            sectionTitleInput.value = '';
            if (sectionOrderInput) sectionOrderInput.value = '1';
        }
        
        // Update modal title
        const modalTitle = document.getElementById('sectionModalLabel');
        if (modalTitle) {
            modalTitle.textContent = 'Add New Section';
        }
    }
    
    // Reset the card form
    function resetCardForm() {
        const cardForm = document.getElementById('card-form');
        if (cardForm) {
            cardForm.reset();
            document.getElementById('card-id').value = '';
            
            // Default values
            document.getElementById('card-icon-type').value = 'bootstrap';
            document.getElementById('card-bootstrap-icon').value = 'bi-box';
            document.getElementById('card-button-icon').value = 'bi-arrow-right';
            
            // Reset color picker
            const colorPicker = document.getElementById('card-icon-color');
            const colorHex = document.getElementById('card-icon-color-hex');
            const iconPreview = document.getElementById('bootstrap-icon-preview');
            
            if (colorPicker) colorPicker.value = '#0d6efd';
            if (colorHex) colorHex.value = '#0d6efd';
            if (iconPreview) {
                iconPreview.className = 'bi bi-box';
                iconPreview.style.color = '#0d6efd';
            }
            
            // Update icon inputs visibility
            const iconTypeSelect = document.getElementById('card-icon-type');
            if (iconTypeSelect) {
                const event = new Event('change');
                iconTypeSelect.dispatchEvent(event);
            }
        }
    }
    
    // Update section dropdown in card form
    function updateSectionDropdown(sections) {
        const sectionSelect = document.getElementById('card-section');
        if (!sectionSelect) return;
        
        // Clear existing options
        sectionSelect.innerHTML = '';
        
        // Add option for each section
        sections.forEach(section => {
            const option = document.createElement('option');
            option.value = section.id;
            option.textContent = section.title;
            sectionSelect.appendChild(option);
        });
    }
    
    // Show notification
    function showNotification(type, message) {
        // Create notification element
        const notificationEl = document.createElement('div');
        notificationEl.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        notificationEl.style.top = '20px';
        notificationEl.style.right = '20px';
        notificationEl.style.zIndex = '9999';
        notificationEl.style.maxWidth = '400px';
        
        // Add icon
        let icon;
        switch (type) {
            case 'success': icon = 'bi-check-circle-fill'; break;
            case 'error': icon = 'bi-exclamation-triangle-fill'; break;
            case 'warning': icon = 'bi-exclamation-circle-fill'; break;
            default: icon = 'bi-info-circle-fill';
        }
        
        notificationEl.innerHTML = `
            <i class="bi ${icon} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Add to DOM
        document.body.appendChild(notificationEl);
        
        // Remove after timeout
        setTimeout(() => {
            if (notificationEl && notificationEl.parentNode) {
                notificationEl.parentNode.removeChild(notificationEl);
            }
        }, 5000);
    }
});
