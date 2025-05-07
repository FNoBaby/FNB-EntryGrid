document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const addUserForm = document.getElementById('add-user-form');
    const editUserForm = document.getElementById('edit-user-form');
    const usersTableBody = document.getElementById('users-table-body');
    const userSearch = document.getElementById('user-search');
    const refreshUsersBtn = document.getElementById('refresh-users');
    const saveUserBtn = document.getElementById('save-user-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const successAlert = document.getElementById('success-alert');
    const errorAlert = document.getElementById('error-alert');
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');
    
    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentNode.querySelector('input');
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            
            const icon = this.querySelector('i');
            icon.classList.toggle('bi-eye');
            icon.classList.toggle('bi-eye-slash');
        });
    });
    
    // Bootstrap modals
    const editUserModal = new bootstrap.Modal(document.getElementById('edit-user-modal'));
    const deleteUserModal = new bootstrap.Modal(document.getElementById('delete-user-modal'));
    
    // Current user being edited or deleted
    let currentUserId = null;
    
    // Load users on page load
    loadUsers();
    
    // Event listeners
    refreshUsersBtn.addEventListener('click', loadUsers);
    
    userSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterUsers(searchTerm);
    });
    
    // Add user form submission
    if (addUserForm) {
        addUserForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('password-confirm').value;
            
            if (password !== confirmPassword) {
                showError('Passwords do not match');
                return;
            }
            
            const formData = new FormData(addUserForm);
            const userData = {
                username: formData.get('username'),
                name: formData.get('name'),
                email: formData.get('email'),
                role: formData.get('role'),
                password: formData.get('password')
            };
            
            try {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    addUserForm.reset();
                    showSuccess('User created successfully');
                    loadUsers();
                } else {
                    showError(data.message || 'Error creating user');
                }
            } catch (error) {
                console.error('Error creating user:', error);
                showError('An unexpected error occurred');
            }
        });
    }
    
    // Edit user button click
    saveUserBtn.addEventListener('click', async function() {
        if (!currentUserId) return;
        
        const formData = new FormData(editUserForm);
        const userData = {
            name: formData.get('name'),
            email: formData.get('email'),
            role: formData.get('role'),
            isActive: formData.get('isActive') === 'true'
        };
        
        // Only include password if it's not empty
        const password = formData.get('password');
        if (password) {
            userData.password = password;
        }
        
        try {
            const response = await fetch(`/api/users/${currentUserId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                editUserModal.hide();
                showSuccess('User updated successfully');
                loadUsers();
            } else {
                showError(data.message || 'Error updating user');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            showError('An unexpected error occurred');
        }
    });
    
    // Delete user confirmation
    confirmDeleteBtn.addEventListener('click', async function() {
        if (!currentUserId) return;
        
        try {
            const response = await fetch(`/api/users/${currentUserId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                deleteUserModal.hide();
                showSuccess('User deleted successfully');
                loadUsers();
            } else {
                const data = await response.json();
                showError(data.message || 'Error deleting user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            showError('An unexpected error occurred');
        }
    });
    
    // Load users from API
    async function loadUsers() {
        try {
            usersTableBody.innerHTML = `
                <tr class="loading-placeholder">
                    <td colspan="7" class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2 text-muted">Loading users...</p>
                    </td>
                </tr>
            `;
            
            const response = await fetch('/api/users');
            const data = await response.json();
            
            if (response.ok) {
                renderUsers(data.users);
                
                // Re-apply search filter if exists
                if (userSearch.value) {
                    filterUsers(userSearch.value.toLowerCase());
                }
            } else {
                showError(data.message || 'Error loading users');
                usersTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-danger py-4">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            Failed to load users
                        </td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('Error loading users:', error);
            showError('An unexpected error occurred');
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger py-4">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Failed to load users
                    </td>
                </tr>
            `;
        }
    }
    
    // Render users table
    function renderUsers(users) {
        if (!users || users.length === 0) {
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        No users found
                    </td>
                </tr>
            `;
            return;
        }
        
        usersTableBody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            
            // Format last login date
            const lastLogin = user.lastLogin 
                ? new Date(user.lastLogin).toLocaleString() 
                : 'Never';
            
            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.name}</td>
                <td>${user.email || '-'}</td>
                <td>
                    <span class="badge ${user.role === 'admin' ? 'bg-primary' : 'bg-secondary'}">
                        ${user.role === 'admin' ? 'Administrator' : 'User'}
                    </span>
                </td>
                <td>
                    <span class="badge ${user.isActive ? 'bg-success' : 'bg-danger'}">
                        ${user.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${lastLogin}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary edit-user-btn" data-user-id="${user.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-user-btn" data-user-id="${user.id}" data-username="${user.username}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            usersTableBody.appendChild(row);
        });
        
        // Add event listeners to the edit and delete buttons
        document.querySelectorAll('.edit-user-btn').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                openEditUserModal(userId);
            });
        });
        
        document.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                const username = this.getAttribute('data-username');
                openDeleteUserModal(userId, username);
            });
        });
    }
    
    // Filter users based on search term
    function filterUsers(searchTerm) {
        const rows = usersTableBody.querySelectorAll('tr:not(.loading-placeholder)');
        
        rows.forEach(row => {
            const username = row.cells[0]?.textContent.toLowerCase() || '';
            const name = row.cells[1]?.textContent.toLowerCase() || '';
            const email = row.cells[2]?.textContent.toLowerCase() || '';
            const role = row.cells[3]?.textContent.toLowerCase() || '';
            
            if (username.includes(searchTerm) || 
                name.includes(searchTerm) || 
                email.includes(searchTerm) || 
                role.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
    
    // Open edit user modal
    async function openEditUserModal(userId) {
        try {
            currentUserId = userId;
            
            const response = await fetch(`/api/users/${userId}`);
            const data = await response.json();
            
            if (response.ok) {
                const user = data.user;
                
                document.getElementById('edit-user-id').value = user.id;
                document.getElementById('edit-username').value = user.username;
                document.getElementById('edit-name').value = user.name;
                document.getElementById('edit-email').value = user.email || '';
                document.getElementById('edit-role').value = user.role;
                document.getElementById('edit-status').value = user.isActive.toString();
                document.getElementById('edit-password').value = '';
                
                editUserModal.show();
            } else {
                showError(data.message || 'Error loading user');
            }
        } catch (error) {
            console.error('Error loading user:', error);
            showError('An unexpected error occurred');
        }
    }
    
    // Open delete user confirmation modal
    function openDeleteUserModal(userId, username) {
        currentUserId = userId;
        document.getElementById('delete-username').textContent = username;
        deleteUserModal.show();
    }
    
    // Show success message
    function showSuccess(message) {
        successMessage.textContent = message;
        successAlert.classList.remove('d-none');
        successAlert.classList.add('show-alert');
        
        setTimeout(() => {
            successAlert.classList.remove('show-alert');
            successAlert.classList.add('d-none');
        }, 5000);
    }
    
    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorAlert.classList.remove('d-none');
        errorAlert.classList.add('show-alert');
        
        setTimeout(() => {
            errorAlert.classList.remove('show-alert');
            errorAlert.classList.add('d-none');
        }, 5000);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const usersTableBody = document.getElementById('users-table-body');
    const addUserBtn = document.getElementById('add-user-btn');
    const userModal = new bootstrap.Modal(document.getElementById('userModal'));
    const userForm = document.getElementById('user-form');
    const saveUserBtn = document.getElementById('save-user-btn');
    const deleteUserBtn = document.getElementById('delete-user-btn');
    const deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const usersSearch = document.getElementById('users-search');
    
    // Current user being edited
    let currentUserId = null;
    // Current logged in user ID (for preventing self-deactivation)
    let currentLoggedInUserId = null;
    
    // Fetch current user ID first
    fetch('/api/user')
        .then(response => response.json())
        .then(data => {
            if (data.user && data.user.id) {
                currentLoggedInUserId = data.user.id;
                console.log('Current logged in user ID:', currentLoggedInUserId);
            }
        })
        .catch(error => console.error('Error fetching current user:', error))
        .finally(() => {
            // Load users after we've tried to get the current user ID
            loadUsers();
        });
    
    // Event Listeners
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function() {
            resetUserForm();
            document.getElementById('userModalLabel').textContent = 'Add New User';
            userModal.show();
        });
    }
    
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', saveUser);
    }
    
    if (deleteUserBtn) {
        deleteUserBtn.addEventListener('click', function() {
            deleteConfirmModal.show();
        });
    }
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            deleteUser(currentUserId);
        });
    }
    
    if (usersSearch) {
        usersSearch.addEventListener('input', function() {
            filterUsers(this.value.toLowerCase());
        });
    }
    
    // Functions
    
    // Reset user form
    function resetUserForm() {
        userForm.reset();
        document.getElementById('user-id').value = '';
        document.getElementById('password-help').classList.remove('d-none');
        deleteUserBtn.classList.add('d-none');
        currentUserId = null;
    }
    
    // Load all users
    async function loadUsers() {
        try {
            console.log('Fetching users via API...');
            const response = await fetch('/api/users');
            
            // Debug response details
            console.log('Response status:', response.status);
            console.log('Response headers:', 
                Array.from(response.headers.entries())
                    .reduce((obj, [key, value]) => {
                        obj[key] = value;
                        return obj;
                    }, {})
            );
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error('Invalid content type:', contentType);
                throw new Error('Server returned non-JSON response');
            }
            
            const data = await response.json();
            console.log('API response data:', data);
            
            if (data.success) {
                if (!data.users || !Array.isArray(data.users)) {
                    console.error('API returned success but users array is missing or invalid:', data);
                    throw new Error('Invalid user data structure received from server');
                }
                
                console.log(`Rendering ${data.users.length} users`);
                renderUsers(data.users);
            } else {
                showError('Failed to load users: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error loading users:', error);
            // Replace loading with error message
            if (usersTableBody) {
                usersTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-4">
                            <div class="alert alert-danger">
                                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                ${error.message || 'Failed to load users. Please try again.'}
                            </div>
                            <button class="btn btn-outline-primary mt-3" onclick="window.location.reload()">
                                <i class="bi bi-arrow-clockwise me-2"></i>Retry
                            </button>
                        </td>
                    </tr>
                `;
            }
        }
    }
    
    // Render users table with additional checks
    function renderUsers(users) {
        // Remove loading indicator
        const loadingRow = document.getElementById('loading-placeholder');
        if (loadingRow) {
            loadingRow.remove();
        }
        
        if (!users || users.length === 0) {
            console.log('No users to render');
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <div class="empty-state">
                            <i class="bi bi-people empty-state-icon"></i>
                            <p class="empty-state-text">No users found</p>
                            <button class="btn btn-primary mt-3" id="empty-add-user-btn">
                                <i class="bi bi-person-plus-fill me-1"></i> Add First User
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            
            // Add event listener to the empty state button
            const emptyAddUserBtn = document.getElementById('empty-add-user-btn');
            if (emptyAddUserBtn) {
                emptyAddUserBtn.addEventListener('click', function() {
                    resetUserForm();
                    document.getElementById('userModalLabel').textContent = 'Add New User';
                    userModal.show();
                });
            }
            
            return;
        }
        
        // Generate table rows
        let html = '';
        
        console.log('Building user rows for', users.length, 'users');
        users.forEach((user, index) => {
            // Validate user object
            if (!user || typeof user !== 'object') {
                console.error('Invalid user object at index', index, user);
                return;
            }
            
            console.log(`Rendering user ${index + 1}:`, user.username, 'Role:', user.role);
            
            // Get first letter of name for avatar
            const initial = user.name ? user.name.charAt(0).toUpperCase() : 
                           (user.username ? user.username.charAt(0).toUpperCase() : 'U');
            
            const isActive = typeof user.isActive === 'boolean' ? user.isActive : true;
            
            // Check if this is the current logged-in user
            const isCurrentUser = currentLoggedInUserId && user.id === currentLoggedInUserId;
            
            html += `
                <tr data-user-id="${user.id}" data-user-name="${user.name || user.username}" class="user-row">
                    <td class="ps-3">
                        <div class="d-flex align-items-center">
                            <div class="user-avatar me-2">${initial}</div>
                            <div>
                                <div class="user-name">${user.name || 'N/A'}</div>
                                <div class="user-username">@${user.username}</div>
                            </div>
                        </div>
                    </td>
                    <td>${user.username}</td>
                    <td>${user.email || '-'}</td>
                    <td>
                        <span class="role-badge ${user.role === 'admin' ? 'role-admin' : 'role-user'}">
                            ${user.role}
                        </span>
                    </td>
                    <td>
                        <div class="form-check form-switch ms-1">
                            <input class="form-check-input status-toggle" type="checkbox" 
                                id="status-toggle-${user.id}" 
                                ${user.isActive ? 'checked' : ''} 
                                ${isCurrentUser ? 'disabled title="You cannot deactivate your own account"' : ''}
                                data-user-id="${user.id}">
                            <label class="form-check-label" for="status-toggle-${user.id}">
                                <span class="status-text ${user.isActive ? 'text-success' : 'text-danger'}">
                                    ${user.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </label>
                        </div>
                    </td>
                    <td class="text-end pe-3">
                        <button class="btn btn-icon btn-action-edit edit-user-btn" title="Edit User">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-icon btn-action-delete delete-user-btn" title="Delete User" ${isCurrentUser ? 'disabled' : ''}>
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        if (usersTableBody) {
            console.log('Updating usersTableBody with HTML');
            usersTableBody.innerHTML = html;
            
            // Add event listeners to buttons
            attachUserRowEventListeners();
        } else {
            console.error('User table body element not found.');
        }
    }
    
    // Attach event listeners to user row buttons
    function attachUserRowEventListeners() {
        console.log('Attaching event listeners to user rows');
        
        document.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const row = this.closest('tr');
                const userId = row.dataset.userId;
                console.log('Edit button clicked for user ID:', userId);
                editUser(userId);
            });
        });
        
        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const row = this.closest('tr');
                const userId = row.dataset.userId;
                const userName = row.dataset.userName;
                console.log('Delete button clicked for user:', userName, 'ID:', userId);
                
                // Set the current user ID and show confirmation modal
                currentUserId = userId;
                document.getElementById('delete-confirm-message').textContent = 
                    `Are you sure you want to delete the user "${userName}"? This action cannot be undone.`;
                
                deleteConfirmModal.show();
            });
        });
        
        // Add event listeners to status toggles
        document.querySelectorAll('.status-toggle').forEach(toggle => {
            toggle.addEventListener('change', function() {
                const userId = this.dataset.userId;
                const isActive = this.checked;
                const statusLabel = this.nextElementSibling.querySelector('.status-text');
                
                // Update status text immediately for better UX
                if (statusLabel) {
                    statusLabel.textContent = isActive ? 'Active' : 'Inactive';
                    statusLabel.className = `status-text ${isActive ? 'text-success' : 'text-danger'}`;
                }
                
                // Update user active status via API
                updateUserStatus(userId, isActive);
            });
        });
    }
    
    // Function to update user status
    async function updateUserStatus(userId, isActive) {
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive })
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to update user status');
            }
            
            // Show success notification
            showToast(`User ${isActive ? 'activated' : 'deactivated'} successfully`, 'success');
            
        } catch (error) {
            console.error('Error updating user status:', error);
            showToast(`Failed to update status: ${error.message}`, 'danger');
            
            // Revert the toggle state and reload users to refresh the view
            loadUsers();
        }
    }
    
    // Filter users
    function filterUsers(searchTerm) {
        const rows = document.querySelectorAll('.user-row');
        
        rows.forEach(row => {
            const name = row.dataset.userName.toLowerCase();
            const username = row.querySelector('.user-username').textContent.toLowerCase();
            const email = row.cells[2].textContent.toLowerCase();
            const role = row.cells[3].textContent.toLowerCase();
            
            // Check if any field contains the search term
            if (name.includes(searchTerm) || 
                username.includes(searchTerm) || 
                email.includes(searchTerm) || 
                role.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
        
        // Check if any rows are visible
        const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');
        
        if (visibleRows.length === 0 && searchTerm) {
            const noResultsRow = document.querySelector('.no-results-row');
            
            if (!noResultsRow) {
                const newRow = document.createElement('tr');
                newRow.className = 'no-results-row';
                newRow.innerHTML = `
                    <td colspan="6" class="text-center py-4">
                        <div class="empty-state">
                            <i class="bi bi-search empty-state-icon"></i>
                            <p class="empty-state-text">No users found matching "${searchTerm}"</p>
                        </div>
                    </td>
                `;
                usersTableBody.appendChild(newRow);
            }
        } else {
            const noResultsRow = document.querySelector('.no-results-row');
            if (noResultsRow) {
                noResultsRow.remove();
            }
        }
    }
    
    // Edit user
    async function editUser(userId) {
        try {
            resetUserForm();
            
            const response = await fetch(`/api/users/${userId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch user details');
            }
            
            const data = await response.json();
            
            if (data.success) {
                const user = data.user;
                
                // Set form values
                document.getElementById('user-id').value = user.id;
                document.getElementById('user-name').value = user.name || '';
                document.getElementById('user-username').value = user.username;
                document.getElementById('user-email').value = user.email || '';
                document.getElementById('user-role').value = user.role;
                
                // Check if isActive field exists and set it
                const statusCheckbox = document.getElementById('user-status');
                if (statusCheckbox && user.hasOwnProperty('isActive')) {
                    statusCheckbox.checked = user.isActive;
                }
                
                // Password field should be empty and show helper text
                document.getElementById('user-password').value = '';
                document.getElementById('password-help').classList.remove('d-none');
                
                // Show delete button and update modal title
                deleteUserBtn.classList.remove('d-none');
                document.getElementById('userModalLabel').textContent = 'Edit User';
                
                // Set current user ID
                currentUserId = user.id;
                
                // Show modal
                userModal.show();
            } else {
                showError('Failed to load user details: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading user details:', error);
            showError('Failed to load user details. Please try again.');
        }
    }
    
    // Save user
    async function saveUser() {
        try {
            // Get form data
            const userId = document.getElementById('user-id').value;
            const name = document.getElementById('user-name').value;
            const username = document.getElementById('user-username').value;
            const email = document.getElementById('user-email').value;
            const password = document.getElementById('user-password').value;
            const role = document.getElementById('user-role').value;
            
            // Check if isActive field exists
            const statusCheckbox = document.getElementById('user-status');
            const isActive = statusCheckbox ? statusCheckbox.checked : true;
            
            // Validate required fields
            if (!username) {
                showError('Username is required');
                return;
            }
            
            if (!userId && !password) {
                showError('Password is required for new users');
                return;
            }
            
            // Create user data object
            const userData = {
                name,
                username,
                email: email || null,
                role,
                isActive
            };
            
            // Add password only if provided (for updates)
            if (password) {
                userData.password = password;
            }
            
            let response;
            
            if (userId) {
                // Update existing user
                response = await fetch(`/api/users/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
            } else {
                // Create new user
                response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save user');
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Hide modal
                userModal.hide();
                
                // Show success message
                showSuccess(userId ? 'User updated successfully' : 'User created successfully');
                
                // Reload users
                loadUsers();
            } else {
                showError('Failed to save user: ' + data.message);
            }
        } catch (error) {
            console.error('Error saving user:', error);
            showError(error.message || 'Failed to save user. Please try again.');
        }
    }
    
    // Delete user
    async function deleteUser(userId) {
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete user');
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Hide modals
                deleteConfirmModal.hide();
                if (userModal._isShown) {
                    userModal.hide();
                }
                
                // Show success message
                showSuccess('User deleted successfully');
                
                // Reload users
                loadUsers();
            } else {
                showError('Failed to delete user: ' + data.message);
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            showError(error.message || 'Failed to delete user. Please try again.');
        }
    }
    
    // Show success notification
    function showSuccess(message) {
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-white bg-success border-0 position-fixed top-0 end-0 m-3';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.style.zIndex = '1060';
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-check-circle-fill me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
        bsToast.show();
        
        // Remove toast when it's hidden
        toast.addEventListener('hidden.bs.toast', function() {
            toast.remove();
        });
    }
    
    // Show error notification
    function showError(message) {
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-white bg-danger border-0 position-fixed top-0 end-0 m-3';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.style.zIndex = '1060';
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-exclamation-circle-fill me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast, { delay: 5000 });
        bsToast.show();
        
        // Remove toast when it's hidden
        toast.addEventListener('hidden.bs.toast', function() {
            toast.remove();
        });
    }
    
    // Expose current user ID for reference
    fetch('/api/user')
        .then(response => response.json())
        .then(data => {
            if (data.user) {
                window.currentUser = data.user;
            }
        })
        .catch(error => console.error('Error fetching current user:', error));
});
