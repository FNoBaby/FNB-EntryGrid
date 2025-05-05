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
