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
    
    const nameElement = document.querySelector('.user-name');
    const emailElement = document.querySelector('.user-email');
    const roleBadge = document.querySelector('.user-role');
    
    const detailItems = document.querySelectorAll('.detail-item');
    let gender = '', phone = '', address = '', affiliation = '', isVerified = false;
    
    detailItems.forEach(item => {
        const label = item.querySelector('.detail-label')?.textContent.toLowerCase();
        const value = item.querySelector('.detail-value')?.textContent;
        
        if (!label || !value) return;
        
        if (label.includes('gender')) gender = value.toLowerCase();
        if (label.includes('phone')) phone = value;
        if (label.includes('address')) address = value;
        if (label.includes('affiliation')) affiliation = value;
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
        affiliation: affiliation,
        role: roleBadge?.textContent.toLowerCase() || '',
        isVerified: isVerified || (window.currentUser?.isVerified === true)
    };
}

// Populate modal form with user data
function populateEditForm(userData) {
    if (!userData) return;
    
    document.getElementById('editFirstName').value = userData.firstName || '';
    document.getElementById('editLastName').value = userData.lastName || '';
    document.getElementById('editEmail').value = userData.email || '';
    
    const phoneInput = document.getElementById('editPhone');
    if (phoneInput && userData.phone) {
        phoneInput.value = userData.phone;
    }
    
    document.getElementById('editAddress').value = userData.address || '';
    document.getElementById('editAffiliation').value = userData.affiliation || '';
    
    const genderSelect = document.getElementById('editGender');
    if (genderSelect && userData.gender) {
        genderSelect.value = userData.gender.toLowerCase();
        
        // Disable gender if it's already set (not "Not_Provided")
        if (userData.gender.toLowerCase() !== 'not_provided' && 
            userData.gender.toLowerCase() !== 'not specified' &&
            userData.gender.toLowerCase() !== '') {
            genderSelect.disabled = true;
            const genderHelp = document.getElementById('editGenderHelp');
            if (genderHelp) {
                genderHelp.innerHTML = '<i class="fas fa-lock"></i> Gender cannot be changed';
            }
        } else {
            genderSelect.disabled = false;
            const genderHelp = document.getElementById('editGenderHelp');
            if (genderHelp) {
                genderHelp.innerHTML = '<i class="fas fa-info-circle"></i> Select gender';
            }
        }
    }
    
    const roleSelect = document.getElementById('editRole');
    if (roleSelect && userData.role) {
        roleSelect.value = userData.role.toLowerCase();
        // Disable role select - role cannot be changed
        roleSelect.disabled = true;
        const roleHelp = document.getElementById('editRoleHelp');
        if (roleHelp) {
            roleHelp.innerHTML = '<i class="fas fa-lock"></i> Role cannot be changed';
        }
    }
    
    const verificationToggle = document.getElementById('editIsVerified');
    if (verificationToggle) {
        verificationToggle.checked = userData.isVerified === true;
    }
}

// Show modal
function showEditModal() {
    const modal = document.getElementById('editUserModal');
    if (!modal) return;
    
    const userData = getCurrentUserData();
    if (!userData || !userData._id) {
        showToastError('Unable to load user data');
        return;
    }
    
    const form = document.getElementById('editUserForm');
    if (form) {
        form.dataset.userId = userData._id;
    }
    
    populateEditForm(userData);
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        document.getElementById('editFirstName')?.focus();
    }, 100);
}

// Hide modal
function hideEditModal() {
    const modal = document.getElementById('editUserModal');
    if (!modal) return;
    
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    const form = document.getElementById('editUserForm');
    if (form) {
        form.reset();
        delete form.dataset.userId;
    }
    
    // Re-enable gender and role for next time
    const genderSelect = document.getElementById('editGender');
    if (genderSelect) genderSelect.disabled = false;
    
    const roleSelect = document.getElementById('editRole');
    if (roleSelect) roleSelect.disabled = false;
}

// Update user via API using PATCH method
async function updateUser(userId, formData) {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication required');
    
    const cleanPhone = formData.phone.replace(/\D/g, '');
    
    const requestData = {
        firstName: formData.firstName?.trim() || '',
        lastName: formData.lastName?.trim() || '',
        phone: cleanPhone || '',
        address: formData.address?.trim() || '',
        affiliation: formData.affiliation?.trim() || '',
        gender: formData.gender || '',
        role: formData.role || '',
        isVerified: formData.isVerified === true || formData.isVerified === 'true'
    };
    
    // Remove empty fields
    Object.keys(requestData).forEach(key => {
        if (requestData[key] === '' || requestData[key] === undefined) {
            delete requestData[key];
        }
    });
    
    try {
        const response = await fetch(`${API_BASE_URL}api/v1/user/${userId}`, {
            method: 'PATCH',
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
    
    if (value.length > 11) {
        value = value.substring(0, 11);
    }
    
    if (value.length >= 4) {
        value = value.replace(/^(\d{4})(\d{0,7})/, '$1 $2');
        if (value.length >= 8) {
            value = value.replace(/^(\d{4})\s(\d{3})(\d{0,4})/, '$1 $2 $3');
        }
    }
    
    input.value = value;
}

// Validate address (minimum 15 characters)
function validateAddress(address) {
    if (!address || address.trim().length < 15) {
        return 'Address must be at least 15 characters';
    }
    return '';
}

// Validate affiliation (if provided)
function validateAffiliation(affiliation) {
    if (affiliation && affiliation.trim().length > 0 && affiliation.trim().length < 5) {
        return 'Affiliation must be at least 5 characters if provided';
    }
    return '';
}

// Validate gender
function validateGender(gender) {
    if (!gender) {
        return 'Please select a gender';
    }
    return '';
}

// Main initialization
document.addEventListener('DOMContentLoaded', function() {
    initializeToastr();
    
    const editModal = document.getElementById('editUserModal');
    if (!editModal) return;
    
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');
    const editCancelBtn = document.getElementById('editCancelBtn');
    const editForm = document.getElementById('editUserForm');
    
    // Open modal when Edit button is clicked
    document.addEventListener('click', function(e) {
        let editButton = e.target;
        
        if (e.target.classList.contains('fa-edit')) {
            editButton = e.target.closest('.edit-btn');
        }
        else if (e.target.textContent.includes('Edit')) {
            editButton = e.target.closest('.edit-btn');
        }
        else if (e.target.classList.contains('edit-btn')) {
            editButton = e.target;
        }
        
        if (editButton && editButton.classList.contains('edit-btn')) {
            e.preventDefault();
            e.stopPropagation();
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
            const value = e.target.value.replace(/\D/g, '');
            if (value.length < 11 && value.length > 0) {
                showToastError('Phone number must be 11 digits');
                e.target.focus();
            }
        });
    }
    
    // Address validation on blur
    const editAddress = document.getElementById('editAddress');
    if (editAddress) {
        editAddress.addEventListener('blur', function(e) {
            const address = e.target.value.trim();
            const error = validateAddress(address);
            if (error) {
                showToastError(error);
                e.target.focus();
            }
        });
    }
    
    // Affiliation validation on blur
    const editAffiliation = document.getElementById('editAffiliation');
    if (editAffiliation) {
        editAffiliation.addEventListener('blur', function(e) {
            const affiliation = e.target.value.trim();
            const error = validateAffiliation(affiliation);
            if (error) {
                showToastError(error);
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
            
            const formData = {
                firstName: document.getElementById('editFirstName').value.trim(),
                lastName: document.getElementById('editLastName').value.trim(),
                phone: document.getElementById('editPhone').value,
                address: document.getElementById('editAddress').value.trim(),
                affiliation: document.getElementById('editAffiliation').value.trim(),
                gender: document.getElementById('editGender').value,
                role: document.getElementById('editRole').value,
                isVerified: document.getElementById('editIsVerified').checked
            };
            
            // Validation
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
            
            // Address validation
            const addressError = validateAddress(formData.address);
            if (addressError) {
                showToastError(addressError);
                document.getElementById('editAddress').focus();
                return;
            }
            
            // Affiliation validation
            const affiliationError = validateAffiliation(formData.affiliation);
            if (affiliationError) {
                showToastError(affiliationError);
                document.getElementById('editAffiliation').focus();
                return;
            }
            
            // Gender validation (only if not disabled)
            const genderSelect = document.getElementById('editGender');
            if (!genderSelect.disabled) {
                const genderError = validateGender(formData.gender);
                if (genderError) {
                    showToastError(genderError);
                    document.getElementById('editGender').focus();
                    return;
                }
            }
            
            updateEditSubmitButton(true);
            
            try {
                await updateUser(userId, formData);
                
                await showSuccessAlert();
                
                hideEditModal();
                
                setTimeout(() => {
                    window.location.reload();
                }, 500);
                
            } catch (error) {
                showToastError(error.message || 'Failed to update user');
                updateEditSubmitButton(false);
            }
        });
    }
    
    // Close modal when clicking outside
    editModal.addEventListener('click', function(e) {
        if (e.target === editModal) {
            hideEditModal();
        }
    });
});