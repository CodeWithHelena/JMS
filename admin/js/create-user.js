// API Configuration
const API_BASE_URL = 'https://fp.247laboratory.net/';
const API_ENDPOINTS = {
    CREATE_USER: 'api/v1/auth/register-editor'
};

// Get token from localStorage
function getAuthToken() {
    return localStorage.getItem('pilot_tkn');
}

// Initialize Toastr
function initializeToastr() {
    if (typeof toastr === 'undefined') {
        console.warn('Toastr not loaded.');
        return false;
    }
    
    toastr.options = {
        positionClass: 'toast-top-right',
        progressBar: true,
        timeOut: 5000,
        closeButton: true,
        newestOnTop: true,
        preventDuplicates: true,
        showEasing: 'swing',
        hideEasing: 'linear',
        showMethod: 'fadeIn',
        hideMethod: 'fadeOut',
        tapToDismiss: false
    };
    
    toastr.clear();
    return true;
}

// Validate email format
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate phone number format
function validatePhone(phone) {
    const phoneRegex = /^0\d{10}$/;
    return phoneRegex.test(phone);
}

// Validate form
function validateForm(formData) {
    const errors = {};

    if (!formData.firstName?.trim()) {
        errors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
        errors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName?.trim()) {
        errors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
        errors.lastName = 'Last name must be at least 2 characters';
    }

    if (!formData.email?.trim()) {
        errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
        errors.email = 'Please enter a valid email address';
    }

    if (!formData.phone?.trim()) {
        errors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
        errors.phone = 'Please enter a valid phone number (11 digits)';
    }

    return errors;
}

// Show field error
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    let errorElement = document.getElementById(`${fieldId}Error`);
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = `${fieldId}Error`;
        errorElement.className = 'error-message';
        errorElement.style.marginTop = '6px';
        field.parentNode.appendChild(errorElement);
    }
    
    field.classList.add('error');
    errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    errorElement.style.display = 'flex';
}

// Clear field error
function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}Error`);
    
    if (field) field.classList.remove('error');
    if (errorElement) errorElement.style.display = 'none';
}

// Clear all field errors
function clearAllErrors() {
    ['firstName', 'lastName', 'email', 'phone'].forEach(clearFieldError);
}

// Show toastr error
function showToastError(message) {
    if (typeof toastr === 'undefined') return;
    
    toastr.clear();
    toastr.error(message, 'Error', {
        timeOut: 5000,
        closeButton: true,
        progressBar: true
    });
}

// Show auto-hide success SweetAlert
function showSuccessAlert() {
    return Swal.fire({
        title: 'Success!',
        text: 'Editor created successfully',
        icon: 'success',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
        backdrop: true,
        allowOutsideClick: false,
        allowEscapeKey: false,
        customClass: {
            popup: 'sweet-alert-popup'
        },
        didOpen: () => {
            // Clear console when alert opens
            console.clear();
        }
    });
}

// Create user via API
async function createUser(formData) {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication required');

    const requestData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim()
    };

    // Clear console before API call
    console.clear();
    console.log('API Request:', requestData);

    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CREATE_USER}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    });

    const responseData = await response.json();
    console.log('API Response:', responseData);

    if (!response.ok) {
        let errorMessage = responseData.message || 'Failed to create editor';
        if (responseData.message?.includes('already exists')) {
            errorMessage = errorMessage.replace(/user with /gi, '');
        }
        throw new Error(errorMessage);
    }

    return responseData;
}

// Update submit button
function updateSubmitButton(isLoading) {
    const submitBtn = document.getElementById('submitBtn');
    if (!submitBtn) return;
    
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        submitBtn.style.opacity = '0.7';
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Editor';
        submitBtn.style.opacity = '1';
    }
}

// Main initialization
document.addEventListener('DOMContentLoaded', function() {
    // Clear console on page load
    console.clear();
    
    // Initialize toastr
    initializeToastr();

    // DOM Elements
    const createUserForm = document.getElementById('createUserForm');
    const cancelBtn = document.getElementById('cancelBtn');

    if (!createUserForm) {
        console.error('Create user form not found');
        return;
    }

    // Real-time validation
    ['firstName', 'lastName', 'email', 'phone'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        field.addEventListener('blur', function() {
            const value = this.value.trim();
            let error = '';
            
            switch(fieldId) {
                case 'firstName':
                    if (!value) error = 'First name is required';
                    else if (value.length < 2) error = 'At least 2 characters';
                    break;
                case 'lastName':
                    if (!value) error = 'Last name is required';
                    else if (value.length < 2) error = 'At least 2 characters';
                    break;
                case 'email':
                    if (!value) error = 'Email is required';
                    else if (!validateEmail(value)) error = 'Invalid email format';
                    break;
                case 'phone':
                    if (!value) error = 'Phone is required';
                    else if (!validatePhone(value)) error = 'Invalid phone format';
                    break;
            }
            
            if (error) showFieldError(fieldId, error);
            else clearFieldError(fieldId);
        });
        
        field.addEventListener('input', () => clearFieldError(fieldId));
    });

    // Form submission
    createUserForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear console
        console.clear();
        
        clearAllErrors();
        
        const formData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value
        };
        
        const errors = validateForm(formData);
        
        if (Object.keys(errors).length > 0) {
            Object.keys(errors).forEach(fieldId => showFieldError(fieldId, errors[fieldId]));
            document.getElementById(Object.keys(errors)[0])?.focus();
            return;
        }
        
        updateSubmitButton(true);
        
        try {
            await createUser(formData);
            
            // Show auto-hide success alert
            await showSuccessAlert();
            
            // Clear form
            createUserForm.reset();
            
            // Focus on first field
            document.getElementById('firstName').focus();
            
        } catch (error) {
            showToastError(error.message || 'Failed to create editor');
        } finally {
            updateSubmitButton(false);
        }
    });

    // Cancel button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            if (confirm('Cancel and lose unsaved changes?')) {
                window.location.href = 'users.html';
            }
        });
    }
});

// Add minimal CSS
const style = document.createElement('style');
style.textContent = `
    .form-input.error {
        border-color: #ef4444 !important;
        background-color: rgba(239, 68, 68, 0.05) !important;
    }
    
    .error-message {
        color: #ef4444;
        font-size: 14px;
        margin-top: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    
    .error-message i {
        font-size: 12px;
    }
    
    /* Toastr colors */
    .toast-success { background-color: #10b981 !important; }
    .toast-error { background-color: #ef4444 !important; }
    
    /* SweetAlert auto-hide animation */
    .swal2-popup {
        border-radius: 12px !important;
        border: 1px solid #e0e0e0 !important;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08) !important;
        animation: swal-fade-in 0.3s ease !important;
    }
    
    @keyframes swal-fade-out {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.9); }
    }
    
    .swal2-hide {
        animation: swal-fade-out 0.3s ease !important;
    }
`;
document.head.appendChild(style);