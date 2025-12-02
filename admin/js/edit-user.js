// API Configuration
// const API_BASE_URL = 'https://fp.247laboratory.net/';
// const API_ENDPOINTS = {
//     USER: 'api/v1/user'
// };

// Get token from localStorage
function getAuthToken() {
    return localStorage.getItem('pilot_tkn');
}

// Initialize Toastr
function initializeToastr() {
    if (typeof toastr === 'undefined') return false;
    
    toastr.options = {
        positionClass: 'toast-top-right',
        progressBar: true,
        timeOut: 5000,
        closeButton: true,
        newestOnTop: true,
        preventDuplicates: true
    };
    
    toastr.clear();
    return true;
}

// Show toastr error
function showToastError(message) {
    if (typeof toastr === 'undefined') {
        alert(`Error: ${message}`);
        return;
    }
    toastr.clear();
    toastr.error(message, 'Error');
}

// Show toastr success
function showToastSuccess(message) {
    if (typeof toastr === 'undefined') {
        alert(`Success: ${message}`);
        return;
    }
    toastr.success(message, 'Success');
}

// Show auto-hide success SweetAlert
function showSuccessAlert() {
    return Swal.fire({
        title: 'Success!',
        text: 'User updated successfully',
        icon: 'success',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
        backdrop: true,
        allowOutsideClick: false,
        allowEscapeKey: false
    });
}

// Get user data from current page
function getCurrentUserData() {
    const userDetails = document.querySelector('.user-details-card');
    if (!userDetails) return null;
    
    // Extract data from the page
    const nameElement = document.querySelector('.user-name');
    const emailElement = document.querySelector('.user-email');
    const roleBadge = document.querySelector('.user-role');
    const statusBadge = document.querySelector('.user-status');
    
    // Extract data from detail items
    const detailItems = document.querySelectorAll('.detail-item');
    let gender = '', phone = '', address = '', isVerified = false;
    
    detailItems.forEach(item => {
        const label = item.querySelector('.detail-label')?.textContent.toLowerCase();
        const value = item.querySelector('.detail-value')?.textContent;
        
        if (!label || !value) return;
        
        if (label.includes('gender')) gender = value.toLowerCase();
        if (label.includes('phone')) phone = value;
        if (label.includes('address')) address = value;
        if (label.includes('verification')) isVerified = value.toLowerCase().includes('verified');
    });
    
    const fullName = nameElement?.textContent.trim() || '';
    const nameParts = fullName.split(' ');
    
    return {
        _id: window.currentUser?._id,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: emailElement?.textContent.trim() || '',
        gender: gender,
        phone: phone.replace(/\D/g, ''),
        address: address,
        role: roleBadge?.textContent.toLowerCase() || '',
        isVerified: isVerified || (window.currentUser?.isVerified === true)
    };
}

// Populate modal form with user data
function populateEditForm(userData) {
    if (!userData) return;
    
    console.log('Populating form with:', userData);
    
    // Basic info
    document.getElementById('editFirstName').value = userData.firstName || '';
    document.getElementById('editLastName').value = userData.lastName || '';
    document.getElementById('editEmail').value = userData.email || '';
    
    // Format phone number
    const phoneInput = document.getElementById('editPhone');
    if (phoneInput && userData.phone) {
        phoneInput.value = userData.phone;
    }
    
    document.getElementById('editAddress').value = userData.address || '';
    
    // Gender select
    const genderSelect = document.getElementById('editGender');
    if (genderSelect && userData.gender) {
        genderSelect.value = userData.gender.toLowerCase();
    }
    
    // Role select
    const roleSelect = document.getElementById('editRole');
    if (roleSelect && userData.role) {
        roleSelect.value = userData.role.toLowerCase();
    }
    
    // Verification toggle
    const verificationToggle = document.getElementById('editIsVerified');
    if (verificationToggle) {
        verificationToggle.checked = userData.isVerified === true;
    }
}

// Show modal
function showEditModal() {
    const modal = document.getElementById('editUserModal');
    if (!modal) {
        console.error('Modal element not found');
        return;
    }
    
    // Get current user data
    const userData = getCurrentUserData();
    if (!userData || !userData._id) {
        showToastError('Unable to load user data');
        return;
    }
    
    console.log('Showing modal for user:', userData);
    
    // Store user ID in form
    const form = document.getElementById('editUserForm');
    if (form) {
        form.dataset.userId = userData._id;
    }
    
    // Populate form
    populateEditForm(userData);
    
    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Focus on first editable field
    setTimeout(() => {
        const firstNameField = document.getElementById('editFirstName');
        if (firstNameField) {
            firstNameField.focus();
        }
    }, 100);
}

// Hide modal
function hideEditModal() {
    const modal = document.getElementById('editUserModal');
    if (!modal) return;
    
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Reset form
    const form = document.getElementById('editUserForm');
    if (form) {
        form.reset();
        delete form.dataset.userId;
    }
}

// Update user via API
async function updateUser(userId, formData) {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication required');
    
    // Clean phone number
    const cleanPhone = formData.phone.replace(/\D/g, '');
    
    const requestData = {
        firstName: formData.firstName?.trim() || '',
        lastName: formData.lastName?.trim() || '',
        phone: cleanPhone || '',
        address: formData.address?.trim() || '',
        role: formData.role || '',
        isVerified: formData.isVerified === true || formData.isVerified === 'true'
    };
    
    // Remove empty fields
    Object.keys(requestData).forEach(key => {
        if (requestData[key] === '' || requestData[key] === undefined) {
            delete requestData[key];
        }
    });
    
    console.log('Updating user with data:', requestData);
    
    try {
        const response = await fetch(`${API_BASE_URL}api/v1/user/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            let errorMessage = responseData.message || `Failed to update user (Status: ${response.status})`;
            throw new Error(errorMessage);
        }
        
        return responseData;
    } catch (error) {
        console.error('Update error:', error);
        throw error;
    }
}

// Update submit button state
function updateEditSubmitButton(isLoading) {
    const submitBtn = document.getElementById('editSubmitBtn');
    if (!submitBtn) return;
    
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.style.opacity = '0.7';
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        submitBtn.style.opacity = '1';
    }
}

// Format phone number as user types
function formatPhoneInput(input) {
    let value = input.value.replace(/\D/g, '');
    
    // Limit to 11 digits for Nigerian numbers
    if (value.length > 11) {
        value = value.substring(0, 11);
    }
    
    // Format for display
    if (value.length >= 4) {
        value = value.replace(/^(\d{4})(\d{0,7})/, '$1 $2');
        if (value.length >= 8) {
            value = value.replace(/^(\d{4})\s(\d{3})(\d{0,4})/, '$1 $2 $3');
        }
    }
    
    input.value = value;
}

// Main initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('Edit user modal script loaded');
    
    // Initialize toastr
    initializeToastr();
    
    // DOM Elements
    const editModal = document.getElementById('editUserModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');
    const editCancelBtn = document.getElementById('editCancelBtn');
    const editForm = document.getElementById('editUserForm');
    
    if (!editModal) {
        console.error('Edit modal element not found');
        return;
    }
    
    // Open modal when Edit button is clicked
    document.addEventListener('click', function(e) {
        const editButton = e.target.closest('.edit-btn');
        if (editButton) {
            e.preventDefault();
            console.log('Edit button clicked');
            showEditModal();
        }
    });
    
    // Close modal on overlay click
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            e.stopPropagation();
            hideEditModal();
        });
    }
    
    // Close modal on close button click
    if (modalClose) {
        modalClose.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            hideEditModal();
        });
    }
    
    // Cancel button
    if (editCancelBtn) {
        editCancelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            hideEditModal();
        });
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && editModal.classList.contains('active')) {
            hideEditModal();
        }
    });
    
    // Prevent modal from closing when clicking inside modal content
    const modalContent = editModal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // Phone number formatting
    const editPhone = document.getElementById('editPhone');
    if (editPhone) {
        editPhone.addEventListener('input', function(e) {
            formatPhoneInput(e.target);
        });
        
        editPhone.addEventListener('blur', function(e) {
            // Ensure minimum length on blur
            const value = e.target.value.replace(/\D/g, '');
            if (value.length < 11 && value.length > 0) {
                showToastError('Phone number must be 11 digits');
                e.target.focus();
            }
        });
    }
    
    // Form submission
    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const userId = this.dataset.userId;
            if (!userId) {
                showToastError('User ID not found');
                return;
            }
            
            // Get form values
            const formData = {
                firstName: document.getElementById('editFirstName').value.trim(),
                lastName: document.getElementById('editLastName').value.trim(),
                phone: document.getElementById('editPhone').value,
                address: document.getElementById('editAddress').value.trim(),
                role: document.getElementById('editRole').value,
                isVerified: document.getElementById('editIsVerified').checked
            };
            
            console.log('Form data:', formData);
            
            // Basic validation
            if (!formData.firstName) {
                showToastError('First name is required');
                document.getElementById('editFirstName').focus();
                return;
            }
            
            if (!formData.lastName) {
                showToastError('Last name is required');
                document.getElementById('editLastName').focus();
                return;
            }
            
            const cleanPhone = formData.phone.replace(/\D/g, '');
            if (!cleanPhone) {
                showToastError('Phone number is required');
                document.getElementById('editPhone').focus();
                return;
            }
            
            if (cleanPhone.length !== 11) {
                showToastError('Phone number must be 11 digits');
                document.getElementById('editPhone').focus();
                return;
            }
            
            if (!formData.role) {
                showToastError('Please select a role');
                document.getElementById('editRole').focus();
                return;
            }
            
            updateEditSubmitButton(true);
            
            try {
                const result = await updateUser(userId, formData);
                console.log('Update result:', result);
                
                // Show success alert
                await showSuccessAlert();
                
                // Hide modal
                hideEditModal();
                
                // Reload page to show updated data
                setTimeout(() => {
                    window.location.reload();
                }, 500);
                
            } catch (error) {
                console.error('Update error:', error);
                showToastError(error.message || 'Failed to update user');
                updateEditSubmitButton(false);
            }
        });
    }
    
    // Close modal when clicking outside (on the modal itself, not overlay)
    editModal.addEventListener('click', function(e) {
        if (e.target === editModal) {
            hideEditModal();
        }
    });
});