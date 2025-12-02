// API Configuration
const API_BASE_URL = 'https://fp.247laboratory.net/';
const API_ENDPOINTS = {
    USER: 'api/v1/user'
};

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
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.USER}/${userId}`, {
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
        console.error('Error fetching user details:', error);
        throw error;
    }
}

// Extract user data from API response
function extractUserData(response) {
    // Handle different response structures
    if (response._id) {
        // Case 1: Direct user object
        return response;
    } else if (response.data && response.data._id) {
        // Case 2: { data: { ...user... } }
        return response.data;
    } else if (response.user && response.user._id) {
        // Case 3: { user: { ...user... } }
        return response.user;
    } else if (response.success && response.data && response.data._id) {
        // Case 4: { success: true, data: { ...user... } }
        return response.data;
    } else if (response.success && response.user && response.user._id) {
        // Case 5: { success: true, user: { ...user... } }
        return response.user;
    } else {
        // Try to find any object with _id in the response
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
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Format based on length
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length > 10) {
        return `+${cleaned.slice(0, cleaned.length - 10)} (${cleaned.slice(cleaned.length - 10, cleaned.length - 7)}) ${cleaned.slice(cleaned.length - 7, cleaned.length - 4)}-${cleaned.slice(cleaned.length - 4)}`;
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
    if (!user.isVerified) return 'status-pending';
    return user.isActive ? 'status-active' : 'status-inactive';
}

// Get status text
function getStatusText(user) {
    if (user.isDeleted) return 'Deleted';
    if (!user.isVerified) return 'Pending Verification';
    return user.isActive ? 'Active' : 'Inactive';
}

// Get gender text
function getGenderText(gender) {
    if (!gender) return 'Not specified';
    return gender.charAt(0).toUpperCase() + gender.slice(1);
}


// Toggle verification status
// Toggle verification status
async function toggleVerification(userId, currentStatus, user) {
    const token = getAuthToken();
    
    if (!token) {
        Swal.fire({
            title: 'Authentication Required',
            text: 'Please login to perform this action',
            icon: 'warning',
            confirmButtonColor: '#cc5500'
        });
        return false;
    }

    try {
        const newStatus = !currentStatus;
        
        // Show loading
        Swal.fire({
            title: 'Updating Verification Status...',
            text: 'Please wait',
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });

        // TODO: Replace with actual API endpoint for updating verification
        // For now, simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate success - Update user object
        user.isVerified = newStatus;
        
        // Close loading
        Swal.close();
        
        // Show success message
        await Swal.fire({
            title: 'Success!',
            text: `User verification ${newStatus ? 'enabled' : 'disabled'} successfully`,
            icon: 'success',
            confirmButtonColor: '#cc5500',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
        });
        
        // Update UI automatically without asking
        updateVerificationUI(user);
        
        return newStatus;
    } catch (error) {
        Swal.close();
        console.error('Error toggling verification:', error);
        Swal.fire({
            title: 'Error',
            text: 'Failed to update verification status',
            icon: 'error',
            confirmButtonColor: '#cc5500'
        });
        return currentStatus;
    }
}

// Update verification UI without refreshing page
function updateVerificationUI(user) {
    const isVerified = user.isVerified === true;
    const currentStatus = getStatusText(user);
    const currentStatusClass = getStatusClass(user);
    
    console.log('Updating UI for verification:', { isVerified, currentStatus, currentStatusClass });
    
    // Update verification toggle
    const verificationToggle = document.getElementById('verificationToggle');
    if (verificationToggle) {
        verificationToggle.checked = isVerified;
        console.log('Toggle updated:', verificationToggle.checked);
    }
    
    // Update toggle status text
    const toggleStatusText = document.getElementById('toggleStatusText');
    if (toggleStatusText) {
        toggleStatusText.textContent = isVerified ? 'Verified' : 'Pending';
        toggleStatusText.className = `toggle-status ${isVerified ? 'toggle-on' : 'toggle-off'}`;
        console.log('Toggle text updated:', toggleStatusText.textContent);
    }
    
    // Update all verification status badges
    const verificationBadges = document.querySelectorAll('.detail-item:nth-child(3) .user-status');
    verificationBadges.forEach((badge, index) => {
        badge.textContent = isVerified ? 'Verified' : 'Pending Verification';
        badge.className = `user-status ${isVerified ? 'status-active' : 'status-pending'}`;
        console.log(`Verification badge ${index} updated`);
    });
    
    // Update account status badge in header
    const headerStatusBadge = document.querySelector('.user-badges .user-status');
    if (headerStatusBadge) {
        headerStatusBadge.textContent = currentStatus;
        headerStatusBadge.className = `user-status ${currentStatusClass}`;
        console.log('Header badge updated:', headerStatusBadge.textContent);
    }
    
    // Update account status in details grid
    const accountStatusBadges = document.querySelectorAll('.details-grid .detail-item:nth-child(1) .user-status');
    accountStatusBadges.forEach((badge, index) => {
        badge.textContent = currentStatus;
        badge.className = `user-status ${currentStatusClass}`;
        console.log(`Account status badge ${index} updated`);
    });
    
    // Update toggle description
    const toggleDescription = document.querySelector('.toggle-description');
    if (toggleDescription) {
        toggleDescription.textContent = isVerified ? 
            'This user account is verified and can access all features.' :
            'This user account is pending verification. Enable to grant full access.';
        console.log('Toggle description updated');
    }
    
    console.log('UI update complete');
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
            Swal.fire({
                title: 'Authentication Required',
                text: 'Please login to perform this action',
                icon: 'warning',
                confirmButtonColor: '#cc5500'
            });
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
            console.error('Error deleting user:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to delete user',
                icon: 'error',
                confirmButtonColor: '#cc5500'
            });
            return false;
        }
    }
    return false;
}

// Render user details
// Render user details
function renderUserDetails(user) {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unnamed User';
    const formattedPhone = formatPhoneNumber(user.phone);
    const currentStatus = getStatusText(user);
    const currentStatusClass = getStatusClass(user);
    
    // Determine if user is verified (for toggle)
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
                                <span class="user-status ${isVerified ? 'status-active' : 'status-pending'}">
                                    ${isVerified ? 'Verified' : 'Pending Verification'}
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
                
                <!-- Verification Toggle -->
                ${!user.isDeleted ? `
                <div class="toggle-section">
                    <div class="toggle-info">
                        <div class="toggle-title">Toggle Verification</div>
                        <div class="toggle-description">
                            ${isVerified ? 
                                'This user account is verified and can access all features.' :
                                'This user account is pending verification. Enable to grant full access.'}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <label class="toggle-switch">
                            <input type="checkbox" id="verificationToggle" ${isVerified ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="toggle-status ${isVerified ? 'toggle-on' : 'toggle-off'}" id="toggleStatusText">
                            ${isVerified ? 'Verified' : 'Pending'}
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
        console.error('Error loading user details:', error);
        showErrorState(error.message || 'Failed to load user details. Please try again.');
    }
});


// Set up event listeners
function setupEventListeners(user) {
    // Store user object globally for updates
    window.currentUser = user;
    
    // Verification toggle
    const verificationToggle = document.getElementById('verificationToggle');
    if (verificationToggle) {
        verificationToggle.addEventListener('change', async (e) => {
            const newStatus = e.target.checked;
            console.log('Toggle changed to:', newStatus, 'Current user status:', user.isVerified);
            
            // Only proceed if status actually changed
            if (newStatus !== user.isVerified) {
                const result = await toggleVerification(user._id, user.isVerified, user);
                if (result !== user.isVerified) {
                    user.isVerified = result;
                } else {
                    // Revert toggle if operation failed
                    verificationToggle.checked = user.isVerified;
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