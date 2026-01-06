// Import utility functions
import { createCustomSelect, createEditorSelect, BASE_URL, token} from './utility.js';




// Get journal ID from URL
function getJournalIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Fetch journal details for editing
async function fetchJournalForEdit(journalId) {
    
    if (!token) {
        throw new Error('Authentication required. Please login.');
    }

    try {
        const response = await fetch(`${BASE_URL}/scope/${journalId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = 'login.html';
                return null;
            }
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching journal details:', error);
        throw error;
    }
}

// Extract journal data from API response
function extractJournalData(response) {
    // Handle different response structures
    if (response._id) {
        // Case 1: Direct journal object
        return response;
    } else if (response.data && response.data._id) {
        // Case 2: { data: { ...journal... } }
        return response.data;
    } else if (response.journal && response.journal._id) {
        // Case 3: { journal: { ...journal... } }
        return response.journal;
    } else if (response.success && response.data && response.data._id) {
        // Case 4: { success: true, data: { ...journal... } }
        return response.data;
    } else if (response.success && response.journal && response.journal._id) {
        // Case 5: { success: true, journal: { ...journal... } }
        return response.journal;
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

// Validate ISSN format
function validateISSN(issn) {
    const issnRegex = /^\d{4}-\d{3}[\dX]$/;
    return issnRegex.test(issn);
}

// Validate DOI prefix format
function validateDOIPrefix(doiPrefix) {
    if (!doiPrefix) return true; // Optional field
    const doiRegex = /^10\.\d{4,}$/;
    return doiRegex.test(doiPrefix);
}

// Validate email format
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate URL format
function validateURL(url) {
    if (!url) return true; // Optional field
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// Validate form
function validateEditForm(formData) {
    const errors = [];

    // Check required fields
    if (!formData.title?.trim()) errors.push('Journal title is required');
    if (!formData.issn?.trim()) errors.push('ISSN is required');
    if (!formData.description?.trim()) errors.push('Description is required');
    if (!formData.publisher?.trim()) errors.push('Publisher is required');
    if (!formData.scope?.trim()) errors.push('Scope/Topics is required');
    if (!formData.email?.trim()) errors.push('Contact email is required');
    if (!formData.reviewPolicy?.trim()) errors.push('Review policy is required');
    if (!formData.currency?.trim()) errors.push('Currency is required');
    
    // Validate editors-in-chief
    if (!formData.editorsInChief || formData.editorsInChief.length === 0) {
        errors.push('At least one Editor-in-Chief is required');
    }

    // Validate formats
    if (formData.issn && !validateISSN(formData.issn)) {
        errors.push('ISSN format is invalid. Use format: XXXX-XXXX');
    }
    
    if (formData.doiPrefix && !validateDOIPrefix(formData.doiPrefix)) {
        errors.push('DOI Prefix format is invalid. Use format: 10.xxxx');
    }
    
    if (formData.email && !validateEmail(formData.email)) {
        errors.push('Contact email is invalid');
    }
    
    if (formData.website && !validateURL(formData.website)) {
        errors.push('Website URL is invalid');
    }

    // Validate fees
    if (formData.submissionFee && (formData.submissionFee < 0 || isNaN(formData.submissionFee))) {
        errors.push('Submission fee must be a positive number');
    }
    
    if (formData.publicationFee && (formData.publicationFee < 0 || isNaN(formData.publicationFee))) {
        errors.push('Publication fee must be a positive number');
    }

    return errors;
}

// Initialize the edit form
async function initializeEditForm() {
    const journalId = getJournalIdFromUrl();
    
    if (!journalId) {
        showErrorState('No journal ID specified in URL');
        return;
    }

    try {
        // Fetch journal data
        const response = await fetchJournalForEdit(journalId);
        
        if (!response) {
            throw new Error('Failed to load journal data');
        }

        const journalData = extractJournalData(response);
        
        if (!journalData) {
            throw new Error('Invalid journal data format received');
        }

        // Populate subtitle
        document.getElementById('journalSubtitle').textContent = `Editing: ${journalData.title || 'Journal'}`;
        
        // Populate form fields
        await populateFormFields(journalData);
        
        // Hide loading, show form
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('journalFormWrapper').style.display = 'block';
        
    } catch (error) {
        console.error('Error initializing edit form:', error);
        showErrorState(error.message || 'Failed to load journal details');
    }
}

// Populate form fields with journal data
async function populateFormFields(journalData) {
    // Set journal ID
    document.getElementById('editJournalId').value = journalData._id;
    
    // Basic Information
    document.getElementById('editTitle').value = journalData.title || '';
    document.getElementById('editIssn').value = journalData.issn || '';
    document.getElementById('editDoiPrefix').value = journalData.doiPrefix || '';
    document.getElementById('editDescription').value = journalData.description || '';
    document.getElementById('editPublisher').value = journalData.publisher || '';
    document.getElementById('editScope').value = journalData.scope || '';
    document.getElementById('editWebsite').value = journalData.website || '';
    document.getElementById('editEmail').value = journalData.email || '';
    
    // Fees
    document.getElementById('editSubmissionFee').value = journalData.submissionFee || '';
    document.getElementById('editPublicationFee').value = journalData.publicationFee || '';
    
    // Initialize select components
    await initializeSelectComponents(journalData);
    
    // Initialize editor tags
    initializeEditorTags(journalData);
    
    // Initialize indexing services
    initializeIndexingServices(journalData);
}

// Initialize select components
async function initializeSelectComponents(journalData) {
    // Review Policy Options
    const reviewPolicyOptions = [
        { value: 'single-blind', label: 'Single-Blind Review' },
        { value: 'double-blind', label: 'Double-Blind Review' },
        { value: 'open', label: 'Open Review' },
        { value: 'editorial', label: 'Editorial Review' }
    ];
    
    // Currency Options
    const currencyOptions = [
        { value: 'NGN', label: 'Nigerian Naira (NGN)' },
        { value: 'USD', label: 'US Dollar (USD)' },
        { value: 'EUR', label: 'Euro (EUR)' },
        { value: 'GBP', label: 'British Pound (GBP)' }
    ];
    
    // Initialize Review Policy Select
    const reviewPolicySelect = createCustomSelect({
        container: document.getElementById('editReviewPolicySelectContainer'),
        placeholder: 'Select review policy',
        options: reviewPolicyOptions,
        onSelect: (selected) => {
            document.getElementById('editReviewPolicy').value = selected.value;
        }
    });
    
    // Initialize Currency Select
    const currencySelect = createCustomSelect({
        container: document.getElementById('editCurrencySelectContainer'),
        placeholder: 'Select currency',
        options: currencyOptions,
        onSelect: (selected) => {
            document.getElementById('editCurrency').value = selected.value;
            document.getElementById('editCurrencySymbol').textContent = selected.value;
            document.getElementById('editCurrencySymbol2').textContent = selected.value;
        }
    });
    
    // Set selected values if they exist
    if (journalData.reviewPolicy) {
        reviewPolicySelect.setSelected(journalData.reviewPolicy);
        document.getElementById('editReviewPolicy').value = journalData.reviewPolicy;
    }
    
    if (journalData.currency) {
        currencySelect.setSelected(journalData.currency);
        document.getElementById('editCurrency').value = journalData.currency;
        document.getElementById('editCurrencySymbol').textContent = journalData.currency;
        document.getElementById('editCurrencySymbol2').textContent = journalData.currency;
    }
}

// Initialize editor tags
function initializeEditorTags(journalData) {
    // Editors-in-Chief
    const editorsInChief = journalData.editorsInChief || [];
    const editorsInChiefTags = document.getElementById('editEditorsInChiefTags');
    
    if (editorsInChief.length > 0) {
        editorsInChiefTags.innerHTML = editorsInChief.map(editor => renderEditorTag(editor, 'chief')).join('');
        document.getElementById('editEditorsInChief').value = JSON.stringify(editorsInChief);
    } else {
        editorsInChiefTags.innerHTML = '<div class="empty-state">No editor-in-chief selected</div>';
        document.getElementById('editEditorsInChief').value = '[]';
    }
    
    // Associate Editors
    const associateEditors = journalData.associateEditors || [];
    const associateEditorsTags = document.getElementById('editAssociateEditorsTags');
    
    if (associateEditors.length > 0) {
        associateEditorsTags.innerHTML = associateEditors.map(editor => renderEditorTag(editor, 'associate')).join('');
        document.getElementById('editAssociateEditors').value = JSON.stringify(associateEditors);
    } else {
        associateEditorsTags.innerHTML = '<div class="empty-state">No associate editors added</div>';
        document.getElementById('editAssociateEditors').value = '[]';
    }
}

// Initialize indexing services
function initializeIndexingServices(journalData) {
    const indexingServices = journalData.indexing || [];
    const indexingDisplay = document.getElementById('editIndexingDisplay');
    
    if (indexingServices.length > 0) {
        indexingDisplay.innerHTML = indexingServices.map((service, index) => renderIndexingItem(service, index)).join('');
        document.getElementById('editIndexingData').value = JSON.stringify(indexingServices);
    } else {
        indexingDisplay.innerHTML = '<div class="empty-state">No indexing services added</div>';
        document.getElementById('editIndexingData').value = '[]';
    }
}

// Render editor tag
function renderEditorTag(editor, type) {
    const editorName = `${editor.firstName || ''} ${editor.lastName || ''}`.trim() || editor.email;
    return `
        <div class="editor-tag" data-id="${editor._id || editor.id}">
            <div class="tag-content">
                <span class="tag-name">${editorName}</span>
                ${editor.email ? `<span class="tag-email">${editor.email}</span>` : ''}
            </div>
            <button type="button" onclick="removeEditor('${editor._id || editor.id}', '${type}')" title="Remove editor">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
}

// Render indexing item
function renderIndexingItem(service, index) {
    return `
        <div class="indexing-item-display" data-index="${index}">
            <div class="indexing-info">
                <div class="indexing-name">${service.name || 'Unnamed Service'}</div>
                ${service.url ? `<div class="indexing-url">${service.url}</div>` : ''}
            </div>
            <button type="button" class="remove-indexing-btn" onclick="removeIndexingService(${index})" title="Remove indexing service">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
}

// Remove editor
function removeEditor(editorId, type) {
    const hiddenField = type === 'chief' ? 'editEditorsInChief' : 'editAssociateEditors';
    const tagsContainer = type === 'chief' ? 'editEditorsInChiefTags' : 'editAssociateEditorsTags';
    
    // Get current editors
    let editors = [];
    try {
        editors = JSON.parse(document.getElementById(hiddenField).value || '[]');
    } catch (e) {
        editors = [];
    }
    
    // Remove editor
    editors = editors.filter(editor => (editor._id || editor.id) !== editorId);
    
    // Update hidden field
    document.getElementById(hiddenField).value = JSON.stringify(editors);
    
    // Update tags display
    const container = document.getElementById(tagsContainer);
    if (editors.length === 0) {
        container.innerHTML = `<div class="empty-state">No ${type === 'chief' ? 'editor-in-chief' : 'associate editors'} selected</div>`;
    } else {
        container.innerHTML = editors.map(editor => renderEditorTag(editor, type)).join('');
    }
}

// Remove indexing service
function removeIndexingService(index) {
    // Get current indexing services
    let indexingServices = [];
    try {
        indexingServices = JSON.parse(document.getElementById('editIndexingData').value || '[]');
    } catch (e) {
        indexingServices = [];
    }
    
    // Remove service at index
    indexingServices.splice(index, 1);
    
    // Update hidden field
    document.getElementById('editIndexingData').value = JSON.stringify(indexingServices);
    
    // Update display
    const indexingDisplay = document.getElementById('editIndexingDisplay');
    if (indexingServices.length === 0) {
        indexingDisplay.innerHTML = '<div class="empty-state">No indexing services added</div>';
    } else {
        indexingDisplay.innerHTML = indexingServices.map((service, idx) => renderIndexingItem(service, idx)).join('');
    }
}

// Add indexing service
function addIndexingService() {
    const nameInput = document.getElementById('editIndexingName');
    const urlInput = document.getElementById('editIndexingUrl');
    
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    
    // Validate inputs
    if (!name) {
        showError('Please enter a name for the indexing service');
        nameInput.focus();
        return;
    }
    
    if (url && !validateURL(url)) {
        showError('Please enter a valid URL');
        urlInput.focus();
        return;
    }
    
    // Get current indexing services
    let indexingServices = [];
    try {
        indexingServices = JSON.parse(document.getElementById('editIndexingData').value || '[]');
    } catch (e) {
        indexingServices = [];
    }
    
    // Add new service
    indexingServices.push({ name, url: url || undefined });
    
    // Update hidden field
    document.getElementById('editIndexingData').value = JSON.stringify(indexingServices);
    
    // Update display
    const indexingDisplay = document.getElementById('editIndexingDisplay');
    indexingDisplay.innerHTML = indexingServices.map((service, index) => renderIndexingItem(service, index)).join('');
    
    // Clear inputs
    nameInput.value = '';
    urlInput.value = '';
}

// Show error using toastr (for form validation)
function showError(message) {
    toastr.error(message, 'Validation Error', {
        positionClass: 'toast-top-right',
        progressBar: true,
        timeOut: 5000,
        closeButton: true
    });
}

// Show success using SweetAlert (for form submission)
function showSuccess(message) {
    return Swal.fire({
        title: 'Success!',
        text: message,
        icon: 'success',
        confirmButtonColor: '#cc5500',
        confirmButtonText: 'OK'
    });
}

// Prepare form data for submission
function prepareEditFormData() {
    const formData = {
        _id: document.getElementById('editJournalId').value,
        title: document.getElementById('editTitle').value.trim(),
        issn: document.getElementById('editIssn').value.trim(),
        doiPrefix: document.getElementById('editDoiPrefix').value.trim() || undefined,
        description: document.getElementById('editDescription').value.trim(),
        publisher: document.getElementById('editPublisher').value.trim(),
        scope: document.getElementById('editScope').value.trim(),
        website: document.getElementById('editWebsite').value.trim() || undefined,
        email: document.getElementById('editEmail').value.trim(),
        reviewPolicy: document.getElementById('editReviewPolicy').value,
        submissionFee: parseFloat(document.getElementById('editSubmissionFee').value) || 0,
        publicationFee: parseFloat(document.getElementById('editPublicationFee').value) || 0,
        currency: document.getElementById('editCurrency').value
    };
    
    // Parse editors
    try {
        formData.editorsInChief = JSON.parse(document.getElementById('editEditorsInChief').value || '[]');
        formData.associateEditors = JSON.parse(document.getElementById('editAssociateEditors').value || '[]');
    } catch (e) {
        formData.editorsInChief = [];
        formData.associateEditors = [];
    }
    
    // Parse indexing services
    try {
        formData.indexing = JSON.parse(document.getElementById('editIndexingData').value || '[]');
    } catch (e) {
        formData.indexing = [];
    }
    
    return formData;
}

// Submit edit form
async function submitEditForm(event) {
    event.preventDefault();
    
    // Prepare form data
    const formData = prepareEditFormData();
    
    // Validate form
    const errors = validateEditForm(formData);
    if (errors.length > 0) {
        errors.forEach(error => showError(error));
        return;
    }
    
    // Show loading state
    Swal.fire({
        title: 'Updating Journal...',
        text: 'Please wait while we update the journal',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });
    
    try {
        const token = getAuthToken();
        
        if (!token) {
            throw new Error('Authentication required. Please login.');
        }

        // Make API call to update journal
        const response = await fetch(`${BASE_URL}/scope/${formData._id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        const result = await response.json();
        
        // Close loading
        Swal.close();
        
        // Show success message with SweetAlert
        const successAlert = await showSuccess('Journal updated successfully!');
        
        if (successAlert.isConfirmed) {
            // Redirect to journal details page
            window.location.href = `journal-details.html?id=${formData._id}`;
        }
        
    } catch (error) {
        // Close loading
        Swal.close();
        
        // Show error with toastr
        console.error('Error updating journal:', error);
        showError(error.message || 'Failed to update journal. Please try again.');
    }
}

// Show error state
function showErrorState(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorState').style.display = 'block';
}

// Main initialization
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize edit form
    await initializeEditForm();
    
    // Set up event listeners
    document.getElementById('journalEditForm').addEventListener('submit', submitEditForm);
    
    // Cancel button
    document.getElementById('editCancelBtn').addEventListener('click', () => {
        window.history.back();
    });
    
    // Add indexing service button
    document.getElementById('editAddIndexingBtn').addEventListener('click', addIndexingService);
    
    // Make functions available globally for inline onclick handlers
    window.removeEditor = removeEditor;
    window.removeIndexingService = removeIndexingService;
    
    // Configure toastr for better visibility
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
        hideMethod: 'fadeOut'
    };
});