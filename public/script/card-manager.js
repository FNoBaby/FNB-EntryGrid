document.addEventListener('DOMContentLoaded', function() {
    // Cache DOM elements
    const sectionsContainer = document.getElementById('sections-container');
    const cardModal = document.getElementById('cardModal');
    const cardForm = document.getElementById('card-form');
    const deleteCardBtn = document.getElementById('delete-card-btn');
    const saveCardBtn = document.getElementById('save-card-btn');
    const cardIdInput = document.getElementById('card-id');
    const cardSectionInput = document.getElementById('card-section');
    const iconTypeSelect = document.getElementById('card-icon-type');
    const imageUrlGroup = document.getElementById('image-url-group');
    const bootstrapIconGroup = document.getElementById('bootstrap-icon-group');
    
    // Section management elements
    const sectionModal = document.getElementById('sectionModal');
    const sectionForm = document.getElementById('section-form');
    const saveSectionBtn = document.getElementById('save-section-btn');
    const deleteSectionBtn = document.getElementById('delete-section-btn');
    const sectionIdInput = document.getElementById('section-id');
    
    // Delete confirmation elements
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    // Global variables for delete confirmation
    let deleteType = null; // 'card' or 'section'
    let deleteId = null;
    let deleteCallback = null;
    
    // Initialize delete confirmation modal handlers
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            if (deleteCallback && typeof deleteCallback === 'function') {
                // Hide the modal before executing the callback
                const modalInstance = bootstrap.Modal.getInstance(deleteConfirmModal);
                if (modalInstance) {
                    modalInstance.hide();
                }
                // Execute the delete operation
                deleteCallback();
            }
        });
        
        // Reset delete data when modal is hidden
        deleteConfirmModal.addEventListener('hidden.bs.modal', function() {
            deleteType = null;
            deleteId = null;
            deleteCallback = null;
            const warningElement = document.getElementById('delete-warning-message');
            if (warningElement) {
                warningElement.classList.add('d-none');
            }
        });
    } else {
        console.error('Delete confirmation modal elements not found. Check if HTML is correctly set up.');
    }

    // Toggle icon input fields based on selected icon type
    iconTypeSelect.addEventListener('change', function() {
        if (this.value === 'image') {
            imageUrlGroup.classList.remove('d-none');
            bootstrapIconGroup.classList.add('d-none');
        } else {
            imageUrlGroup.classList.add('d-none');
            bootstrapIconGroup.classList.remove('d-none');
        }
    });
    
    // Load sections and cards from the server
    loadSections();
    
    // Add event listeners for card management
    document.getElementById('add-card-btn').addEventListener('click', () => {
        openAddCardModal();
    });
    
    saveCardBtn.addEventListener('click', saveCard);
    deleteCardBtn.addEventListener('click', deleteCard);
    
    // Add event listeners for section management
    document.getElementById('add-section-btn').addEventListener('click', () => {
        resetSectionForm();
    });
    
    saveSectionBtn.addEventListener('click', saveSection);
    deleteSectionBtn.addEventListener('click', deleteSection);
    
    // Modal reset when hidden
    cardModal.addEventListener('hidden.bs.modal', () => {
        resetForm();
    });
    
    sectionModal.addEventListener('hidden.bs.modal', () => {
        resetSectionForm();
    });
    
    function resetForm() {
        cardForm.reset();
        cardIdInput.value = '';
        deleteCardBtn.classList.add('d-none');
        document.getElementById('cardModalLabel').textContent = 'Add New Card';
        
        // Default to image type
        iconTypeSelect.value = 'image';
        imageUrlGroup.classList.remove('d-none');
        bootstrapIconGroup.classList.add('d-none');
    }
    
    function resetSectionForm() {
        sectionForm.reset();
        sectionIdInput.value = '';
        deleteSectionBtn.classList.add('d-none');
        document.getElementById('sectionModalLabel').textContent = 'Add New Section';
    }
    
    function openAddCardModal(sectionId = null) {
        resetForm();
        if (sectionId) {
            cardSectionInput.value = sectionId;
        }
        const modal = new bootstrap.Modal(cardModal);
        modal.show();
    }
    
    function loadSections() {
        fetch('/api/sections')
            .then(response => response.json())
            .then(sections => {
                sectionsContainer.innerHTML = ''; // Clear existing sections
                
                if (sections.length === 0) {
                    showNoSectionsMessage();
                } else {
                    // Sort sections by order
                    sections.sort((a, b) => a.order - b.order);
                    
                    // Create a section for each element in sections array
                    sections.forEach(section => {
                        createSectionElement(section);
                    });
                }
                
                // Now load all cards
                loadCards();
            })
            .catch(error => {
                console.error('Error loading sections:', error);
                showNotification('Failed to load sections', 'danger');
            });
    }
    
    function showNoSectionsMessage() {
        const noSectionsEl = document.createElement('div');
        noSectionsEl.className = 'text-center my-5 py-5';
        noSectionsEl.innerHTML = `
            <div class="display-1 text-muted mb-4">
                <i class="bi bi-layout-text-window"></i>
            </div>
            <h3 class="text-muted mb-4">No sections found</h3>
            <p class="lead mb-4">Get started by adding your first section</p>
            <button class="btn btn-primary btn-lg" id="start-add-section-btn">
                <i class="bi bi-plus-circle me-2"></i>Add First Section
            </button>
        `;
        
        sectionsContainer.appendChild(noSectionsEl);
        
        // Add event listener to the button
        document.getElementById('start-add-section-btn').addEventListener('click', () => {
            resetSectionForm();
            const modal = new bootstrap.Modal(sectionModal);
            modal.show();
        });
    }
    
    function createSectionElement(section) {
        const sectionEl = document.createElement('div');
        sectionEl.className = 'mb-5';
        sectionEl.dataset.sectionId = section.id;
        
        const headerEl = document.createElement('div');
        headerEl.className = 'section-header d-flex justify-content-center mb-4 position-relative';
        
        // Create title
        const titleEl = document.createElement('h2');
        titleEl.className = 'section-heading text-center';
        titleEl.textContent = section.title;
        
        // Create control buttons container
        const controlsEl = document.createElement('div');
        controlsEl.className = 'section-controls';
        
        // Edit section button
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-outline-primary me-2';
        editBtn.innerHTML = '<i class="bi bi-pencil-square"></i> Edit Section';
        editBtn.addEventListener('click', () => {
            editSection(section);
        });
        
        // Add card button
        const addCardBtn = document.createElement('button');
        addCardBtn.className = 'btn btn-sm btn-success add-card-btn';
        addCardBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Add Card';
        addCardBtn.addEventListener('click', () => {
            openAddCardModal(section.id);
        });
        
        // Add controls to header
        controlsEl.appendChild(editBtn);
        controlsEl.appendChild(addCardBtn);
        
        // Center title and add controls
        headerEl.appendChild(titleEl);
        headerEl.appendChild(controlsEl);
        
        // Create cards container
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'row cards-container justify-content-center';
        cardsContainer.dataset.sectionId = section.id;
        
        sectionEl.appendChild(headerEl);
        sectionEl.appendChild(cardsContainer);
        
        sectionsContainer.appendChild(sectionEl);
    }
    
    function loadCards() {
        fetch('/api/cards')
            .then(response => response.json())
            .then(cards => {
                // Group cards by section
                const cardsBySection = {};
                cards.forEach(card => {
                    if (!cardsBySection[card.sectionId]) {
                        cardsBySection[card.sectionId] = [];
                    }
                    cardsBySection[card.sectionId].push(card);
                });
                
                // Render cards for each section
                for (const sectionId in cardsBySection) {
                    const container = document.querySelector(`.cards-container[data-section-id="${sectionId}"]`);
                    if (container) {
                        renderCards(cardsBySection[sectionId], container);
                    }
                }
                
                // Check for empty sections and add helper message
                document.querySelectorAll('.cards-container').forEach(container => {
                    if (container.children.length === 0) {
                        showEmptySectionMessage(container);
                    }
                });
            })
            .catch(error => {
                console.error('Error loading cards:', error);
                showNotification('Failed to load cards', 'danger');
            });
    }
    
    function showEmptySectionMessage(container) {
        const sectionId = container.dataset.sectionId;
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'col-12 text-center my-4 py-4';
        emptyMessage.innerHTML = `
            <div class="text-muted">
                <i class="bi bi-card-list display-4 mb-3"></i>
                <h5>No cards in this section</h5>
                <p>Click the "Add Card" button to add your first card</p>
                <button class="btn btn-success add-card-empty-btn">
                    <i class="bi bi-plus-circle me-2"></i>Add Card
                </button>
            </div>
        `;
        
        container.appendChild(emptyMessage);
        
        // Add event listener to the button
        emptyMessage.querySelector('.add-card-empty-btn').addEventListener('click', () => {
            openAddCardModal(sectionId);
        });
    }
    
    function renderCards(cards, container) {
        container.innerHTML = '';
        
        // Sort cards by order
        cards.sort((a, b) => a.order - b.order);
        
        cards.forEach(card => {
            const cardElement = createCardElement(card);
            container.appendChild(cardElement);
        });
    }
    
    function createCardElement(card) {
        const colDiv = document.createElement('div');
        colDiv.className = 'col-md-5 col-lg-4 mb-4';
        colDiv.dataset.cardId = card.id;
        
        let iconHtml;
        if (card.iconType === 'image') {
            iconHtml = `<img src="${card.imageUrl}" class="card-img-top" alt="${card.title} Logo">`;
        } else {
            // Use the card's iconColor property or default to blue
            const iconColor = card.iconColor || '#0d6efd';
            iconHtml = `
                <div class="card-img-container">
                    <i class="bi ${card.bootstrapIcon}" style="font-size: 5rem; color: ${iconColor}"></i>
                </div>
            `;
        }
        
        colDiv.innerHTML = `
            <div class="card clickable-card" data-url="${card.url}">
                ${iconHtml}
                <button class="edit-card-btn btn btn-sm">
                    <i class="bi bi-pencil"></i>
                </button>
                <div class="card-body text-center">
                    <h5 class="card-title">${card.title}</h5>
                    <p class="card-text">${card.description}</p>
                    <a href="${card.url}" class="btn btn-primary w-100 card-btn" target="_blank" rel="noopener noreferrer">
                        <i class="bi ${card.buttonIcon || 'bi-box-arrow-up-right'} me-2"></i>Go to ${card.title}
                    </a>
                </div>
            </div>
        `;
        
        // Add event listener to make the whole card clickable
        const clickableCard = colDiv.querySelector('.clickable-card');
        if (clickableCard) {
            clickableCard.addEventListener('click', function(e) {
                // Check if click was on a button or link
                if (!e.target.closest('.edit-card-btn') && !e.target.closest('.card-btn')) {
                    window.open(this.dataset.url, '_blank');
                }
            });
        }
        
        // Add event listener to edit button
        colDiv.querySelector('.edit-card-btn').addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent card click
            editCard(card);
        });
        
        return colDiv;
    }
    
    function editCard(card) {
        // Populate form
        cardIdInput.value = card.id;
        cardSectionInput.value = card.sectionId;
        document.getElementById('card-title').value = card.title;
        document.getElementById('card-description').value = card.description;
        document.getElementById('card-url').value = card.url;
        document.getElementById('card-icon-type').value = card.iconType;
        document.getElementById('card-image-url').value = card.imageUrl || '';
        document.getElementById('card-bootstrap-icon').value = card.bootstrapIcon || '';
        document.getElementById('card-button-icon').value = card.buttonIcon || '';
        document.getElementById('card-order').value = card.order;
        
        // Set the icon color if it exists
        if (card.iconType === 'bootstrap') {
            const colorPicker = document.getElementById('card-icon-color');
            const colorHexInput = document.getElementById('card-icon-color-hex');
            
            // Use the card's iconColor or default to blue
            const iconColor = card.iconColor || '#0d6efd';
            
            if (colorPicker) colorPicker.value = iconColor;
            if (colorHexInput) colorHexInput.value = iconColor;
        }
        
        // Toggle icon input fields based on selected icon type
        if (card.iconType === 'image') {
            imageUrlGroup.classList.remove('d-none');
            bootstrapIconGroup.classList.add('d-none');
        } else {
            imageUrlGroup.classList.add('d-none');
            bootstrapIconGroup.classList.remove('d-none');
        }
        
        // Show delete button and update modal title
        deleteCardBtn.classList.remove('d-none');
        document.getElementById('cardModalLabel').textContent = 'Edit Card';
        
        // Open modal
        const modal = new bootstrap.Modal(cardModal);
        modal.show();
    }
    
    function editSection(section) {
        // Populate form
        sectionIdInput.value = section.id;
        document.getElementById('section-title').value = section.title;
        document.getElementById('section-order').value = section.order;
        
        // Show delete button and update modal title
        deleteSectionBtn.classList.remove('d-none');
        document.getElementById('sectionModalLabel').textContent = 'Edit Section';
        
        // Open modal
        const modal = new bootstrap.Modal(sectionModal);
        modal.show();
    }
    
    function saveCard() {
        // Get form data
        const formData = new FormData(cardForm);
        const cardData = Object.fromEntries(formData.entries());
        
        // Validate form
        if (!cardData.title || !cardData.description || !cardData.url || !cardData.sectionId) {
            showErrorModal('Missing required fields', 'Please fill out all required fields.');
            return;
        }
        
        // Process icon data based on icon type
        if (cardData.iconType === 'image' && !cardData.imageUrl) {
            showErrorModal('Missing image URL', 'Please provide an image URL for the icon.');
            return;
        } else if (cardData.iconType === 'bootstrap' && !cardData.bootstrapIcon) {
            showErrorModal('Missing Bootstrap icon', 'Please provide a Bootstrap icon class.');
            return;
        }
        
        // Determine if we're adding or updating
        const isUpdate = !!cardData.id;
        const method = isUpdate ? 'PUT' : 'POST';
        const url = isUpdate ? `/api/cards/${cardData.id}` : '/api/cards';
        
        // Send to server
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cardData)
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to save card');
            return response.json();
        })
        .then(data => {
            // Close modal
            bootstrap.Modal.getInstance(cardModal).hide();
            
            // Reload cards
            loadCards();
            
            // Show success notification
            showNotification(isUpdate ? 'Card updated successfully' : 'Card added successfully', 'success');
        })
        .catch(error => {
            console.error('Error saving card:', error);
            showErrorModal('Save failed', 'Failed to save card. Please try again.');
        });
    }
    
    function saveSection() {
        // Get form data
        const formData = new FormData(sectionForm);
        const sectionData = Object.fromEntries(formData.entries());
        
        // Validate form
        if (!sectionData.title) {
            showErrorModal('Missing section title', 'Please enter a section title.');
            return;
        }
        
        // Determine if we're adding or updating
        const isUpdate = !!sectionData.id;
        const method = isUpdate ? 'PUT' : 'POST';
        const url = isUpdate ? `/api/sections/${sectionData.id}` : '/api/sections';
        
        // Send to server
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sectionData)
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to save section');
            return response.json();
        })
        .then(data => {
            // Close modal
            bootstrap.Modal.getInstance(sectionModal).hide();
            
            // Reload sections
            loadSections();
            
            // Show success notification
            showNotification(isUpdate ? 'Section updated successfully' : 'Section added successfully', 'success');
        })
        .catch(error => {
            console.error('Error saving section:', error);
            showErrorModal('Save failed', 'Failed to save section. Please try again.');
        });
    }
    
    // Function to show delete confirmation modal
    function showDeleteConfirmation(type, id, message, warningMessage, callback) {
        if (!deleteConfirmModal) {
            console.error('Delete confirmation modal not found in the DOM');
            // Fallback to browser confirm
            if (confirm(message || `Are you sure you want to delete this ${type}?`)) {
                callback();
            }
            return;
        }

        deleteType = type;
        deleteId = id;
        deleteCallback = callback;
        
        // Set the confirmation message
        const messageElement = document.getElementById('delete-confirm-message');
        if (messageElement) {
            messageElement.textContent = message || `Are you sure you want to delete this ${type}?`;
        }
        
        // Set warning message if provided
        const warningElement = document.getElementById('delete-warning-message');
        const warningTextElement = document.getElementById('delete-warning-text');
        
        if (warningElement && warningTextElement) {
            if (warningMessage) {
                warningTextElement.textContent = warningMessage;
                warningElement.classList.remove('d-none');
            } else {
                warningElement.classList.add('d-none');
            }
        }
        
        // Show the modal
        try {
            const modal = new bootstrap.Modal(deleteConfirmModal);
            modal.show();
        } catch (error) {
            console.error('Error showing delete confirmation modal:', error);
            // Fallback to browser confirm
            if (confirm(message || `Are you sure you want to delete this ${type}?`)) {
                callback();
            }
        }
    }

    // Fix issues with the deletion buttons by moving initialization to the main DOMContentLoaded handler
    // Log elements to console to debug
    console.log('Delete buttons:', {
        deleteCardBtn: deleteCardBtn,
        deleteSectionBtn: deleteSectionBtn,
        confirmDeleteBtn: confirmDeleteBtn
    });
    
    // Direct event handlers - bypass the custom delete confirmation for now
    if (deleteCardBtn) {
        deleteCardBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Delete card button clicked');
            
            // Use browser's native confirm for now
            if (confirm('Are you sure you want to delete this card?')) {
                const cardId = cardIdInput.value;
                if (!cardId) return;
                
                // Show loading state
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';
                this.disabled = true;
                
                fetch(`/api/cards/${cardId}`, {
                    method: 'DELETE'
                })
                .then(response => {
                    if (!response.ok) throw new Error('Failed to delete card');
                    return response.json();
                })
                .then(data => {
                    console.log('Card deleted successfully:', data);
                    bootstrap.Modal.getInstance(cardModal).hide();
                    loadCards();
                    showNotification('Card deleted successfully', 'success');
                })
                .catch(error => {
                    console.error('Error deleting card:', error);
                    showNotification('Failed to delete card', 'danger');
                })
                .finally(() => {
                    this.innerHTML = 'Delete';
                    this.disabled = false;
                });
            }
        });
    } else {
        console.error('Delete card button not found');
    }
    
    if (deleteSectionBtn) {
        deleteSectionBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Delete section button clicked');
            
            // Use browser's native confirm for now
            if (confirm('Are you sure you want to delete this section and all its cards?')) {
                const sectionId = sectionIdInput.value;
                if (!sectionId) return;
                
                // Show loading state
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';
                this.disabled = true;
                
                fetch(`/api/sections/${sectionId}`, {
                    method: 'DELETE'
                })
                .then(response => {
                    if (!response.ok) throw new Error('Failed to delete section');
                    return response.json();
                })
                .then(data => {
                    console.log('Section deleted successfully:', data);
                    bootstrap.Modal.getInstance(sectionModal).hide();
                    loadSections();
                    showNotification('Section deleted successfully', 'success');
                })
                .catch(error => {
                    console.error('Error deleting section:', error);
                    showNotification('Failed to delete section', 'danger');
                })
                .finally(() => {
                    this.innerHTML = 'Delete';
                    this.disabled = false;
                });
            }
        });
    } else {
        console.error('Delete section button not found');
    }
    
    // Add function to show error modal
    function showErrorModal(title, message) {
        const errorModal = document.getElementById('errorModal');
        const errorTitle = document.getElementById('errorModalLabel');
        const errorMessage = document.getElementById('error-message');
        
        // Set content
        errorTitle.textContent = title || 'Error';
        errorMessage.textContent = message || 'An error occurred.';
        
        // Show modal
        const modal = new bootstrap.Modal(errorModal);
        modal.show();
    }
    
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `toast align-items-center text-white bg-${type} border-0`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');
        notification.setAttribute('aria-atomic', 'true');
        
        notification.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        // Add to document
        const toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.appendChild(notification);
        document.body.appendChild(toastContainer);
        
        // Show notification
        const toast = new bootstrap.Toast(notification, { autohide: true, delay: 3000 });
        toast.show();
        
        // Remove after hiding
        notification.addEventListener('hidden.bs.toast', () => {
            toastContainer.remove();
        });
    }
    
    // Initialize color picker and icon preview functionality
    function initializeIconPreviewAndColorPicker() {
        // Get references to DOM elements
        const bootstrapIconInput = document.getElementById('card-bootstrap-icon');
        const iconPreview = document.getElementById('bootstrap-icon-preview');
        const iconColorPicker = document.getElementById('card-icon-color');
        const iconColorHex = document.getElementById('card-icon-color-hex');
        
        // Ensure all elements exist before adding event listeners
        if (!bootstrapIconInput || !iconPreview) {
            console.warn('Bootstrap icon elements not found in the DOM');
            return;
        }
        
        if (!iconColorPicker || !iconColorHex) {
            console.warn('Color picker elements not found in the DOM');
            return;
        }
        
        console.log('Icon preview elements found:', {
            bootstrapIconInput,
            iconPreview,
            iconColorPicker,
            iconColorHex
        });
        
        // Function to update the icon preview
        function updateIconPreview() {
            // Get current icon class and color
            const iconClass = bootstrapIconInput.value.trim();
            const iconColor = iconColorPicker.value || '#0d6efd';
            
            console.log('Updating icon preview:', { iconClass, iconColor });
            
            // Update icon class
            iconPreview.className = 'bi';
            if (iconClass) {
                // Handle if user enters with or without the bi- prefix
                if (iconClass.startsWith('bi-')) {
                    iconPreview.classList.add(iconClass);
                } else {
                    iconPreview.classList.add('bi-' + iconClass);
                }
            } else {
                iconPreview.classList.add('bi-box');
            }
            
            // Update icon color with !important to override any CSS
            iconPreview.style.color = iconColor + ' !important';
            // Also set it as an attribute for debugging
            iconPreview.setAttribute('data-color', iconColor);
        }
        
        // Add event listeners
        bootstrapIconInput.addEventListener('input', updateIconPreview);
        
        iconColorPicker.addEventListener('input', function() {
            iconColorHex.value = this.value;
            updateIconPreview();
        });
        
        iconColorHex.addEventListener('input', function() {
            // Validate hex color format
            const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(this.value);
            if (isValidHex) {
                iconColorPicker.value = this.value;
                updateIconPreview();
            }
        });
        
        iconColorHex.addEventListener('blur', function() {
            let val = this.value.trim();
            if (val && !val.startsWith('#')) {
                val = '#' + val;
                this.value = val;
            }
            
            // Validate hex color format
            const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(val);
            if (!isValidHex && val) {
                this.value = iconColorPicker.value;
            } else if (isValidHex) {
                iconColorPicker.value = val;
            }
            updateIconPreview();
        });
        
        // Initialize preview
        updateIconPreview();
        
        // Return the update function for use elsewhere
        return updateIconPreview;
    }
    
    // Initialize after DOM is fully loaded and after the card modal is shown
    document.addEventListener('DOMContentLoaded', function() {
        // Try initializing immediately
        setTimeout(initializeIconPreviewAndColorPicker, 500);
        
        // Also initialize when the card modal is shown
        const cardModal = document.getElementById('cardModal');
        if (cardModal) {
            cardModal.addEventListener('shown.bs.modal', function() {
                setTimeout(initializeIconPreviewAndColorPicker, 100);
            });
        }
    });
});

/**
 * Card Manager - Handles CRUD operations for cards
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize card form event handlers
    const cardForm = document.getElementById('card-form');
    const saveCardBtn = document.getElementById('save-card-btn');
    const cardModal = document.getElementById('cardModal') ? 
                      new bootstrap.Modal(document.getElementById('cardModal')) : null;
    
    if (cardForm && saveCardBtn) {
        cardForm.addEventListener('submit', (e) => e.preventDefault());
        
        saveCardBtn.addEventListener('click', async function() {
            if (!validateCardForm()) return;
            
            const formData = new FormData(cardForm);
            const cardData = {
                id: formData.get('id'),
                title: formData.get('title'),
                description: formData.get('description'),
                url: formData.get('url'),
                iconType: formData.get('iconType'),
                sectionId: formData.get('sectionId'),
                order: formData.get('order') || 1
            };
            
            // Set appropriate icon based on type
            if (cardData.iconType === 'image') {
                cardData.imageUrl = formData.get('imageUrl');
                cardData.bootstrapIcon = null;
                cardData.iconColor = null; // No color for image icons
            } else {
                cardData.bootstrapIcon = formData.get('bootstrapIcon');
                cardData.imageUrl = null;
                // Include the icon color when using Bootstrap icons
                cardData.iconColor = formData.get('iconColor') || '#0d6efd';
            }
            
            cardData.buttonIcon = formData.get('buttonIcon');
            
            try {
                let response;
                
                if (cardData.id) {
                    // Update existing card
                    response = await fetch(`/api/cards/${cardData.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(cardData)
                    });
                } else {
                    // Create new card
                    response = await fetch('/api/cards', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(cardData)
                    });
                }
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to save card');
                }
                
                // Hide modal before reloading data
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('cardModal'));
                if (modalInstance) {
                    modalInstance.hide();
                }
                
                // Trigger the dashboard to reload sections/cards
                if (window.loadSections) {
                    window.loadSections();
                } else {
                    // Fallback - just reload the page
                    window.location.reload();
                }
                
                // Show success message
                showNotification('Card saved successfully', 'success');
                
            } catch (error) {
                console.error('Error saving card:', error);
                showNotification(error.message, 'error');
            }
        });
    }
    
    // Icon type toggle
    const iconTypeSelect = document.getElementById('card-icon-type');
    if (iconTypeSelect) {
        iconTypeSelect.addEventListener('change', function() {
            const imageUrlGroup = document.getElementById('image-url-group');
            const bootstrapIconGroup = document.getElementById('bootstrap-icon-group');
            
            if (this.value === 'image') {
                imageUrlGroup.classList.remove('d-none');
                bootstrapIconGroup.classList.add('d-none');
            } else {
                imageUrlGroup.classList.add('d-none');
                bootstrapIconGroup.classList.remove('d-none');
            }
        });
    }
    
    // Sync color picker input with hex text input
    const iconColorPicker = document.getElementById('card-icon-color');
    const iconColorHex = document.getElementById('card-icon-color-hex');
    
    if (iconColorPicker && iconColorHex) {
        // Update hex input when color picker changes
        iconColorPicker.addEventListener('input', function() {
            iconColorHex.value = this.value;
        });
        
        // Update color picker when hex input changes
        iconColorHex.addEventListener('input', function() {
            // Validate hex color format
            const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(this.value);
            if (isValidHex) {
                iconColorPicker.value = this.value;
            }
        });
        
        // Ensure hex value starts with # when focus is lost
        iconColorHex.addEventListener('blur', function() {
            let val = this.value.trim();
            if (val && !val.startsWith('#')) {
                val = '#' + val;
                this.value = val;
            }
            
            // Validate hex color format
            const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(val);
            if (!isValidHex && val) {
                this.value = iconColorPicker.value;
            } else if (isValidHex) {
                iconColorPicker.value = val;
            }
        });
    }
    
    // Validate card form
    function validateCardForm() {
        const title = document.getElementById('card-title').value.trim();
        const description = document.getElementById('card-description').value.trim();
        const url = document.getElementById('card-url').value.trim();
        const iconType = document.getElementById('card-icon-type').value;
        const imageUrl = document.getElementById('card-image-url').value.trim();
        const bootstrapIcon = document.getElementById('card-bootstrap-icon').value.trim();
        const sectionId = document.getElementById('card-section').value;
        
        if (!title) {
            showNotification('Title is required', 'error');
            return false;
        }
        
        if (!description) {
            showNotification('Description is required', 'error');
            return false;
        }
        
        if (!url) {
            showNotification('URL is required', 'error');
            return false;
        }
        
        if (!sectionId) {
            showNotification('Section is required', 'error');
            return false;
        }
        
        if (iconType === 'image' && !imageUrl) {
            showNotification('Image URL is required for image icons', 'error');
            return false;
        }
        
        if (iconType === 'bootstrap' && !bootstrapIcon) {
            showNotification('Bootstrap icon class is required for bootstrap icons', 'error');
            return false;
        }
        
        return true;
    }
    
    // Section form handling
    const sectionForm = document.getElementById('section-form');
    const saveSectionBtn = document.getElementById('save-section-btn');
    const sectionModal = document.getElementById('sectionModal') ? 
                         new bootstrap.Modal(document.getElementById('sectionModal')) : null;
    
    if (sectionForm && saveSectionBtn) {
        sectionForm.addEventListener('submit', (e) => e.preventDefault());
        
        saveSectionBtn.addEventListener('click', async function() {
            const formData = new FormData(sectionForm);
            const sectionData = {
                id: formData.get('id'),
                title: formData.get('title'),
                order: formData.get('order') || 1
            };
            
            if (!sectionData.title.trim()) {
                showNotification('Section title is required', 'error');
                return;
            }
            
            try {
                let response;
                
                if (sectionData.id) {
                    // Update existing section
                    response = await fetch(`/api/sections/${sectionData.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(sectionData)
                    });
                } else {
                    // Create new section
                    response = await fetch('/api/sections', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(sectionData)
                    });
                }
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to save section');
                }
                
                // Hide modal before reloading data
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('sectionModal'));
                if (modalInstance) {
                    modalInstance.hide();
                }
                
                // Trigger the dashboard to reload sections
                if (window.loadSections) {
                    window.loadSections();
                } else {
                    // Fallback - just reload the page
                    window.location.reload();
                }
                
                // Show success message
                showNotification('Section saved successfully', 'success');
                
            } catch (error) {
                console.error('Error saving section:', error);
                showNotification(error.message, 'error');
            }
        });
    }
    
    // Helper function to show notifications
    function showNotification(message, type = 'info') {
        // Use a notification function if available from dashboard.js
        if (window.showNotification) {
            window.showNotification(type, message);
            return;
        }
        
        // Fallback to alert if no notification system is available
        if (type === 'error') {
            alert(`Error: ${message}`);
        } else {
            alert(message);
        }
    }
    
    // Export needed functions for dashboard.js to use
    window.cardManager = {
        validateCardForm,
        showNotification
    };
    
    // Initialize icon preview on page load
    setTimeout(updateIconPreview, 100);
});
