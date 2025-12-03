// API Configuration
const API_BASE_URL = 'https://fp.247laboratory.net/';

// Get token from localStorage
function getAuthToken() {
    return localStorage.getItem('pilot_tkn');
}

// Get user ID from URL
function getUserIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Fetch user details
async function fetchUserDetails(userId) {
    const token = getAuthToken();
    
    if (!token) {
        Swal.fire({
            title: 'Authentication Required',
            text: 'Please login to view user details',
            icon: 'warning',
            confirmButtonColor: '#cc5500'
        }).then(() => {
            window.location.href = 'login.html';
        });
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}api/v1/user/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                Swal.fire({
                    title: 'Session Expired',
                    text: 'Please login again',
                    icon: 'warning',
                    confirmButtonColor: '#cc5500'
                }).then(() => {
                    window.location.href = 'login.html';
                });
                return null;
            }
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw error;
    }
}

// Extract user data from API response
function extractUserData(response) {
    if (response._id) {
        return response;
    } else if (response.data && response.data._id) {
        return response.data;
    } else if (response.user && response.user._id) {
        return response.user;
    } else if (response.success && response.data && response.data._id) {
        return response.data;
    } else if (response.success && response.user && response.user._id) {
        return response.user;
    } else {
        for (const key in response) {
            if (response[key] && typeof response[key] === 'object' && response[key]._id) {
                return response[key];
            }
        }
    }
    return null;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

// Format phone number
function formatPhoneNumber(phone) {
    if (!phone) return 'N/A';
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 11) {
        return cleaned.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3');
    } else if (cleaned.length > 11) {
        return `+${cleaned.slice(0, cleaned.length - 11)} (${cleaned.slice(cleaned.length - 11, cleaned.length - 8)}) ${cleaned.slice(cleaned.length - 8, cleaned.length - 5)} ${cleaned.slice(cleaned.length - 5)}`;
    }
    return phone;
}

// Get role class
function getRoleClass(role) {
    const roleLower = (role || '').toLowerCase();
    switch (roleLower) {
        case 'editor':
            return 'role-editor';
        case 'author':
            return 'role-author';
        case 'reviewer':
            return 'role-reviewer';
        case 'admin':
            return 'role-admin';
        default:
            return 'role-editor';
    }
}

// Get status class
function getStatusClass(user) {
    if (user.isDeleted) return 'status-inactive';
    
    // For reviewers pending verification
    if (user.role && user.role.toLowerCase() === 'reviewer' && user.isVerified === false) {
        return 'status-pending';
    }
    
    // For all users based on active status
    return user.isActive !== false ? 'status-active' : 'status-inactive';
}

// Get status text
function getStatusText(user) {
    if (user.isDeleted) return 'Deleted';
    
    // For reviewers pending verification
    if (user.role && user.role.toLowerCase() === 'reviewer' && user.isVerified === false) {
        return 'Pending Verification';
    }
    
    // For all users based on active status
    return user.isActive !== false ? 'Active' : 'Inactive';
}

// Get verification status text
function getVerificationText(user) {
    if (user.isDeleted) return 'Deleted';
    
    if (user.role && user.role.toLowerCase() === 'reviewer') {
        return user.isVerified === true ? 'Verified' : 'Pending Verification';
    }
    
    return user.isVerified === true ? 'Verified' : 'Not Required';
}

// Get verification class
function getVerificationClass(user) {
    if (user.isDeleted) return 'status-inactive';
    
    if (user.role && user.role.toLowerCase() === 'reviewer') {
        return user.isVerified === true ? 'status-active' : 'status-pending';
    }
    
    return user.isVerified === true ? 'status-active' : 'status-pending';
}

// Get gender text
function getGenderText(gender) {
    if (!gender) return 'Not specified';
    if (gender.toLowerCase() === 'not_provided') return 'Not provided';
    return gender.charAt(0).toUpperCase() + gender.slice(1);
}

// Toggle user active/inactive status
async function toggleUserActive(userId, currentActiveStatus, user) {
    const token = getAuthToken();
    
    if (!token) {
        showToastError('Authentication required. Please login.');
        return false;
    }

    try {
        const newStatus = !currentActiveStatus;
        
        // Show loading
        Swal.fire({
            title: newStatus ? 'Activating User...' : 'Deactivating User...',
            text: 'Please wait',
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });

        // Use toggle endpoint for ALL users (activation/deactivation)
        const response = await fetch(`${API_BASE_URL}api/v1/user/${userId}/toggle`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(responseData.message || 'Failed to update user status');
        }
        
        // Close loading
        Swal.close();
        
        // Show success message
        Swal.fire({
            title: 'Success!',
            text: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
            icon: 'success',
            confirmButtonColor: '#cc5500',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
        });
        
        // Update user object
        user.isActive = newStatus;
        
        // Update UI
        updateUserStatusUI(user);
        
        return newStatus;
    } catch (error) {
        Swal.close();
        showToastError(error.message || 'Failed to update user status');
        return currentActiveStatus;
    }
}

// Delete user
async function deleteUser(userId, userName) {
    const result = await Swal.fire({
        title: 'Delete User',
        html: `Are you sure you want to delete <strong>${userName}</strong>?<br><br>
               <span style="color: #dc2626; font-size: 14px;">
               <i class="fas fa-exclamation-triangle"></i> This action cannot be undone.</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, delete user',
        cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
        const token = getAuthToken();
        
        if (!token) {
            showToastError('Authentication required. Please login.');
            return false;
        }

        try {
            // Show loading
            Swal.fire({
                title: 'Deleting User...',
                text: 'Please wait',
                allowOutsideClick: false,
                showConfirmButton: false,
                willOpen: () => {
                    Swal.showLoading();
                }
            });

            // TODO: Replace with actual API endpoint for deletion
            // For now, simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Simulate success
            Swal.close();
            
            Swal.fire({
                title: 'Deleted!',
                text: 'User has been deleted successfully',
                icon: 'success',
                confirmButtonColor: '#cc5500'
            }).then(() => {
                // Redirect to users list
                window.location.href = 'users.html';
            });
            
            return true;
        } catch (error) {
            Swal.close();
            showToastError(error.message || 'Failed to delete user');
            return false;
        }
    }
    return false;
}

// Update user status UI (for activation/deactivation)
function updateUserStatusUI(user) {
    const isActive = user.isActive !== false;
    const isVerified = user.isVerified === true;
    
    // Update toggle
    const verificationToggle = document.getElementById('verificationToggle');
    if (verificationToggle) {
        verificationToggle.checked = isActive;
    }
    
    // Update toggle status text
    const toggleStatusText = document.getElementById('toggleStatusText');
    if (toggleStatusText) {
        toggleStatusText.textContent = isActive ? 'Active' : 'Inactive';
        toggleStatusText.className = `toggle-status ${isActive ? 'toggle-on' : 'toggle-off'}`;
    }
    
    // Update account status badges
    const accountStatusBadges = document.querySelectorAll('.details-grid .detail-item:nth-child(1) .user-status');
    accountStatusBadges.forEach((badge) => {
        badge.textContent = isActive ? 'Active' : 'Inactive';
        badge.className = `user-status ${isActive ? 'status-active' : 'status-inactive'}`;
    });
    
    // Update verification status badges
    const verificationBadges = document.querySelectorAll('.details-grid .detail-item:nth-child(3) .user-status');
    verificationBadges.forEach((badge) => {
        if (user.role === 'reviewer') {
            badge.textContent = isVerified ? 'Verified' : 'Pending Verification';
            badge.className = `user-status ${isVerified ? 'status-active' : 'status-pending'}`;
        } else {
            badge.textContent = isVerified ? 'Verified' : 'Not Required';
            badge.className = `user-status ${isVerified ? 'status-active' : 'status-pending'}`;
        }
    });
    
    // Update account status badge in header
    const headerStatusBadge = document.querySelector('.user-badges .user-status');
    if (headerStatusBadge) {
        if (user.role === 'reviewer' && !isVerified) {
            headerStatusBadge.textContent = 'Pending Verification';
            headerStatusBadge.className = 'user-status status-pending';
        } else {
            headerStatusBadge.textContent = isActive ? 'Active' : 'Inactive';
            headerStatusBadge.className = `user-status ${isActive ? 'status-active' : 'status-inactive'}`;
        }
    }
    
    // Update toggle description
    const toggleDescription = document.querySelector('.toggle-description');
    if (toggleDescription) {
        toggleDescription.textContent = isActive ? 
            'This user account is active and can access the system.' :
            'This user account is inactive and cannot access the system.';
    }
}

// Show toastr error
function showToastError(message) {
    if (typeof toastr === 'undefined') return;
    toastr.clear();
    toastr.error(message, 'Error');
}

// Show toastr success
function showToastSuccess(message) {
    if (typeof toastr === 'undefined') return;
    toastr.success(message, 'Success');
}

// Render user details
function renderUserDetails(user) {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unnamed User';
    const formattedPhone = formatPhoneNumber(user.phone);
    const currentStatus = getStatusText(user);
    const currentStatusClass = getStatusClass(user);
    const verificationStatus = getVerificationText(user);
    const verificationClass = getVerificationClass(user);
    const isActive = user.isActive !== false;
    const isVerified = user.isVerified === true;
    
    return `
        <div class="user-details-card">
            <div class="user-header">
                <div class="user-info">
                    <h1 class="user-name">${fullName}</h1>
                    <div class="user-email">${user.email || 'No email'}</div>
                    <div class="user-badges">
                        <span class="user-role ${getRoleClass(user.role)}">${user.role || 'N/A'}</span>
                        <span class="user-status ${currentStatusClass}">${currentStatus}</span>
                    </div>
                </div>
            </div>
            
            <div class="user-body">
                <!-- Personal Information Section -->
                <div class="section">
                    <h2 class="section-title">
                        <i class="fas fa-user"></i> Personal Information
                    </h2>
                    <div class="details-grid">
                        <div class="detail-item">
                            <div class="detail-label">Full Name</div>
                            <div class="detail-value">${fullName}</div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Gender</div>
                            <div class="detail-value">${getGenderText(user.gender)}</div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Email</div>
                            <div class="detail-value">${user.email || 'N/A'}</div>
                            ${user.email ? `
                            <div class="detail-actions">
                                <a href="mailto:${user.email}" class="action-link email-action">
                                    <i class="fas fa-envelope"></i> Send Email
                                </a>
                            </div>
                            ` : ''}
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Phone</div>
                            <div class="detail-value">${formattedPhone}</div>
                            ${user.phone ? `
                            <div class="detail-actions">
                                <a href="tel:${user.phone.replace(/[^0-9+]/g, '')}" class="action-link phone-action">
                                    <i class="fas fa-phone"></i> Call
                                </a>
                            </div>
                            ` : ''}
                        </div>
                        
                        ${user.address ? `
                        <div class="detail-item">
                            <div class="detail-label">Address</div>
                            <div class="detail-value">${user.address}</div>
                        </div>
                        ` : ''}
                        
                        ${user.affiliation ? `
                        <div class="detail-item">
                            <div class="detail-label">Affiliation</div>
                            <div class="detail-value">${user.affiliation}</div>
                        </div>
                        ` : ''}
                        
                        <div class="detail-item">
                            <div class="detail-label">User ID</div>
                            <div class="detail-value">
                                <code style="font-size: 14px; background: var(--body-bg); padding: 4px 8px; border-radius: 4px;">
                                    ${user._id || 'N/A'}
                                </code>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Account Information Section -->
                <div class="section">
                    <h2 class="section-title">
                        <i class="fas fa-cog"></i> Account Information
                    </h2>
                    <div class="details-grid">
                        <div class="detail-item">
                            <div class="detail-label">Account Status</div>
                            <div class="detail-value">
                                <span class="user-status ${currentStatusClass}">
                                    ${currentStatus}
                                </span>
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Role</div>
                            <div class="detail-value">
                                <span class="user-role ${getRoleClass(user.role)}">
                                    ${user.role || 'N/A'}
                                </span>
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Verification Status</div>
                            <div class="detail-value">
                                <span class="user-status ${verificationClass}">
                                    ${verificationStatus}
                                </span>
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Account Created</div>
                            <div class="detail-value">${formatDate(user.createdAt)}</div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Last Updated</div>
                            <div class="detail-value">${formatDate(user.updatedAt)}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Activation/Deactivation Toggle -->
                ${!user.isDeleted ? `
                <div class="toggle-section">
                    <div class="toggle-info">
                        <div class="toggle-title">Account Status</div>
                        <div class="toggle-description">
                            ${isActive ? 
                                'This user account is active and can access the system.' :
                                'This user account is inactive and cannot access the system.'}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <label class="toggle-switch">
                            <input type="checkbox" id="verificationToggle" ${isActive ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="toggle-status ${isActive ? 'toggle-on' : 'toggle-off'}" id="toggleStatusText">
                            ${isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
                ` : ''}
                
                <!-- Action Buttons -->
                <div class="action-buttons">
                    <a href="users.html" class="action-btn back-list-btn">
                        <i class="fas fa-list"></i> Back to Users
                    </a>
                    
                    ${!user.isDeleted ? `
                    <button class="action-btn edit-btn" data-user-id="${user._id}">
                        <i class="fas fa-edit"></i> Edit User
                    </button>
                    ` : ''}
                    
                    ${!user.isDeleted ? `
                    <button class="action-btn delete-btn" id="deleteUserBtn">
                        <i class="fas fa-trash"></i> Delete User
                    </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Show error state
function showErrorState(message) {
    const userDetails = document.getElementById('userDetails');
    userDetails.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error Loading User</h3>
            <p>${message || 'Failed to load user details.'}</p>
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                <a href="users.html" class="action-btn back-list-btn" style="display: inline-flex;">
                    <i class="fas fa-arrow-left"></i> Back to Users
                </a>
                <button onclick="location.reload()" class="action-btn edit-btn" style="display: inline-flex;">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        </div>
    `;
}

// Set up event listeners
function setupEventListeners(user) {
    window.currentUser = user;
    
    // Activation/Deactivation toggle
    const verificationToggle = document.getElementById('verificationToggle');
    if (verificationToggle) {
        const isActive = user.isActive !== false;
        verificationToggle.checked = isActive;
        
        verificationToggle.addEventListener('change', async (e) => {
            const newStatus = e.target.checked;
            
            if (newStatus !== isActive) {
                const result = await toggleUserActive(user._id, isActive, user);
                if (result !== isActive) {
                    user.isActive = result;
                } else {
                    // Revert toggle if operation failed
                    verificationToggle.checked = isActive;
                }
            }
        });
    }
    
    // Delete button
    const deleteBtn = document.getElementById('deleteUserBtn');
    if (deleteBtn) {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'this user';
        deleteBtn.addEventListener('click', () => {
            deleteUser(user._id, fullName);
        });
    }
}

// Main initialization
document.addEventListener('DOMContentLoaded', async function() {
    const userDetails = document.getElementById('userDetails');
    const userId = getUserIdFromUrl();

    if (!userId) {
        showErrorState('No user ID specified in URL');
        return;
    }

    try {
        const response = await fetchUserDetails(userId);
        
        if (!response) {
            throw new Error('No response received from server');
        }

        const userData = extractUserData(response);
        
        if (!userData) {
            throw new Error('Invalid user data format received');
        }

        userDetails.innerHTML = renderUserDetails(userData);
        
        // Set up event listeners after rendering
        setupEventListeners(userData);
        
    } catch (error) {
        showErrorState(error.message || 'Failed to load user details. Please try again.');
    }
});