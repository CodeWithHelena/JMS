import { 
    createCustomSelect, 
    selectOneEditor, 
    selectMultipleEditors, 
    submitJournalData 
} from './utility.js';

// Define variables in the module scope
let journalForm;
let reviewPolicySelect;
let currencySelect;
let chiefEditorSelect;
let associateEditorSelect;
let indexingArray = [];
let editorsInChiefArray = [];
let associateEditorsArray = [];

// Validate DOI prefix
function validateDoiPrefix(doiPrefix) {
    if (!doiPrefix) return true; // Optional field, empty is valid
    
    // DOI prefix should be in format: 10.xxxx (minimum 4 digits after decimal)
    const doiRegex = /^10\.\d{4,}$/;
    return doiRegex.test(doiPrefix);
}

// Show single error at a time
function showSingleError(message) {
    if (typeof toastr !== 'undefined') {
        toastr.clear(); // Clear any existing toasts
        toastr.error(message, 'Error');
    } else {
        alert('Error: ' + message);
    }
}

// Show success toast
function showSuccess(message) {
    if (typeof toastr !== 'undefined') {
        toastr.clear();
        toastr.success(message, 'Success');
    } else {
        alert('Success: ' + message);
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize form element
    journalForm = document.getElementById('journalCreateForm');
    
    // Initialize Toastr
    if (typeof toastr !== 'undefined') {
        toastr.options = {
            "closeButton": true,
            "debug": false,
            "newestOnTop": true,
            "progressBar": true,
            "positionClass": "toast-top-right",
            "preventDuplicates": true,
            "onclick": null,
            "showDuration": "300",
            "hideDuration": "1000",
            "timeOut": "5000",
            "extendedTimeOut": "1000",
            "showEasing": "swing",
            "hideEasing": "linear",
            "showMethod": "fadeIn",
            "hideMethod": "fadeOut"
        };
    }

    // Form elements
    const addIndexingBtn = document.getElementById('addIndexingBtn');
    const indexingDisplay = document.getElementById('indexingDisplay');
    const indexingData = document.getElementById('indexingData');
    const chiefEditorSelectContainer = document.getElementById('chiefEditorSelectContainer');
    const associateEditorSelectContainer = document.getElementById('associateEditorSelectContainer');
    const reviewPolicySelectContainer = document.getElementById('reviewPolicySelectContainer');
    const currencySelectContainer = document.getElementById('currencySelectContainer');
    const editorsInChiefTags = document.getElementById('editorsInChiefTags');
    const associateEditorsTags = document.getElementById('associateEditorsTags');
    const editorsInChiefInput = document.getElementById('editorsInChief');
    const associateEditorsInput = document.getElementById('associateEditors');
    const reviewPolicyInput = document.getElementById('reviewPolicy');
    const currencyInput = document.getElementById('currency');

    // Create currency select options
    const currencyOptions = [
        { value: 'NGN', label: 'Nigerian Naira (NGN)' },
        { value: 'USD', label: 'US Dollar (USD)' },
        { value: 'EUR', label: 'Euro (EUR)' },
        { value: 'GBP', label: 'British Pound (GBP)' },
        { value: 'JPY', label: 'Japanese Yen (JPY)' }
    ];

    // Create review policy select
    reviewPolicySelect = createCustomSelect({
        container: reviewPolicySelectContainer,
        placeholder: 'Select review policy',
        options: [
            { value: 'single-blind', label: 'Single-blind peer review' },
            { value: 'double-blind', label: 'Double-blind peer review' },
            { value: 'open-review', label: 'Open peer review' }
        ],
        onSelect: (selected) => {
            if (selected) {
                reviewPolicyInput.value = selected.value;
            }
        }
    });

    // Create currency select
    currencySelect = createCustomSelect({
        container: currencySelectContainer,
        placeholder: 'Select currency',
        options: currencyOptions,
        onSelect: (selected) => {
            if (selected) {
                currencyInput.value = selected.value;
                updateCurrencySymbols(selected.value);
            }
        }
    });

    // Create Chief Editor Select (Single selection)
    chiefEditorSelect = await selectOneEditor(
        chiefEditorSelectContainer,
        'Search for editor-in-chief...',
        (selected) => {
            if (selected.length > 0) {
                editorsInChiefArray = selected;
                renderEditorTags();
            }
        }
    );

    // Create Associate Editor Select (Multiple selection)
    associateEditorSelect = await selectMultipleEditors(
        associateEditorSelectContainer,
        'Search for associate editors...',
        (selected) => {
            associateEditorsArray = selected;
            renderEditorTags();
        }
    );

    // Update currency symbols
    function updateCurrencySymbols(currency) {
        const currencySymbolsMap = {
            'NGN': '₦',
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'JPY': '¥'
        };
        
        const symbol = currencySymbolsMap[currency] || currency;
        document.querySelectorAll('.currency-prefix').forEach(el => {
            el.textContent = symbol;
        });
    }

    // Render indexing display
    function renderIndexingDisplay() {
        if (indexingArray.length === 0) {
            indexingDisplay.innerHTML = '<div class="empty-state">No indexing services added</div>';
            indexingData.value = '[]';
            return;
        }

        indexingDisplay.innerHTML = indexingArray.map((item, index) => `
            <div class="indexing-item-display">
                <div class="indexing-info">
                    <div class="indexing-name">${item.name}</div>
                    <div class="indexing-url">${item.url}</div>
                </div>
                <button type="button" class="remove-indexing-btn" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        updateIndexingData();
    }

    // Update hidden indexing data
    function updateIndexingData() {
        const validIndexing = indexingArray.map(item => ({
            name: item.name.trim(),
            url: item.url.trim()
        })).filter(item => item.name && item.url);
        
        indexingData.value = JSON.stringify(validIndexing);
    }

    // Add new indexing item
    addIndexingBtn.addEventListener('click', function() {
        const nameInput = document.getElementById('indexingName');
        const urlInput = document.getElementById('indexingUrl');
        
        const name = nameInput.value.trim();
        const url = urlInput.value.trim();
        
        if (name && url) {
            indexingArray.push({ name, url });
            renderIndexingDisplay();
            
            // Clear inputs
            nameInput.value = '';
            urlInput.value = '';
            //showSuccess('Indexing service added');
        } else {
            showSingleError('Please enter both name and URL for the indexing service.');
        }
    });

    // Remove indexing item
    indexingDisplay.addEventListener('click', function(e) {
        if (e.target.closest('.remove-indexing-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const index = parseInt(e.target.closest('.remove-indexing-btn').getAttribute('data-index'));
            indexingArray.splice(index, 1);
            renderIndexingDisplay();
        }
    });

    // Render editor tags
    function renderEditorTags() {
        // Render Editors-in-Chief tags
        if (editorsInChiefArray.length === 0) {
            editorsInChiefTags.innerHTML = '<div class="empty-state">No editor-in-chief selected</div>';
        } else {
            editorsInChiefTags.innerHTML = editorsInChiefArray.map(editor => `
                <div class="editor-tag">
                    <div class="tag-content">
                        <span class="tag-name">${editor.name}</span>
                        <span class="tag-email">${editor.email}</span>
                    </div>
                    <button type="button" class="remove-chief-editor" data-id="${editor.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }
        
        // Render Associate Editors tags
        if (associateEditorsArray.length === 0) {
            associateEditorsTags.innerHTML = '<div class="empty-state">No associate editors added</div>';
        } else {
            associateEditorsTags.innerHTML = associateEditorsArray.map(editor => `
                <div class="editor-tag">
                    <div class="tag-content">
                        <span class="tag-name">${editor.name}</span>
                        <span class="tag-email">${editor.email}</span>
                    </div>
                    <button type="button" class="remove-associate-editor" data-id="${editor.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }
        
        // Update hidden inputs
        editorsInChiefInput.value = JSON.stringify(editorsInChiefArray.map(e => e.id));
        associateEditorsInput.value = JSON.stringify(associateEditorsArray.map(e => e.id));
    }

    // Remove editor handlers - NO SUCCESS MESSAGES
    document.addEventListener('click', function(e) {
        if (e.target.closest('.remove-chief-editor')) {
            e.preventDefault();
            const editorId = e.target.closest('.remove-chief-editor').getAttribute('data-id');
            editorsInChiefArray = editorsInChiefArray.filter(editor => editor.id !== editorId);
            renderEditorTags();
            if (chiefEditorSelect) {
                chiefEditorSelect.setSelected([]);
            }
        }
        
        if (e.target.closest('.remove-associate-editor')) {
            e.preventDefault();
            const editorId = e.target.closest('.remove-associate-editor').getAttribute('data-id');
            associateEditorsArray = associateEditorsArray.filter(editor => editor.id !== editorId);
            renderEditorTags();
            if (associateEditorSelect) {
                associateEditorSelect.setSelected(associateEditorsArray);
            }
        }
    });

    // Form validation - returns first error found
    function getFirstError() {
        // Required fields
        const title = document.getElementById('journalTitle').value.trim();
        if (!title) return 'Journal title is required';

        const issn = document.getElementById('journalIssn').value.trim();
        if (!issn) return 'ISSN is required';
        
        // Validate ISSN format
        const issnRegex = /^\d{4}-\d{3}[\dX]$/;
        if (issn && !issnRegex.test(issn)) {
            return 'Please enter a valid ISSN in format XXXX-XXXX';
        }

        const description = document.getElementById('journalDescription').value.trim();
        if (!description) {
            return 'Description is required';
        } else if (description.length < 10) {
            return 'Description must be at least 10 characters long';
        }

        const publisher = document.getElementById('journalPublisher').value.trim();
        if (!publisher) return 'Publisher is required';

        const email = document.getElementById('journalEmail').value.trim();
        if (!email) return 'Contact email is required';
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            return 'Please enter a valid email address';
        }

        const reviewPolicy = reviewPolicySelect.getValue();
        if (!reviewPolicy) return 'Review policy is required';

        const currency = currencySelect.getValue();
        if (!currency) return 'Currency is required';

        // Validate DOI prefix format
        const doiPrefix = document.getElementById('journalDoiPrefix').value.trim();
        if (doiPrefix && !validateDoiPrefix(doiPrefix)) {
            return 'Invalid DOI prefix format (e.g., 10.1234)';
        }

        // Validate at least one Editor-in-Chief
        if (editorsInChiefArray.length === 0) {
            return 'Please add at least one Editor-in-Chief';
        }

        // Validate indexing services format
        const indexingDataValue = indexingData.value;
        if (indexingDataValue && indexingDataValue.trim() !== '[]') {
            try {
                const indexing = JSON.parse(indexingDataValue);
                if (Array.isArray(indexing)) {
                    for (let i = 0; i < indexing.length; i++) {
                        const item = indexing[i];
                        if (item.name && !item.url) {
                            return `Indexing service "${item.name}" is missing URL`;
                        }
                        if (!item.name && item.url) {
                            return `Indexing service URL "${item.url}" is missing name`;
                        }
                    }
                }
            } catch (e) {
                if (indexingDataValue.trim() !== '') {
                    console.error('Error parsing indexing data:', e);
                    return 'Invalid indexing services data format';
                }
            }
        }

        return null; // No errors
    }

    // Reset form function
    window.resetForm = function() {
        if (journalForm) {
            journalForm.reset();
        }
        indexingArray = [];
        editorsInChiefArray = [];
        associateEditorsArray = [];
        
        // Clear indexing display and data
        if (indexingDisplay) {
            indexingDisplay.innerHTML = '<div class="empty-state">No indexing services added</div>';
        }
        if (indexingData) {
            indexingData.value = '[]';
        }
        
        renderEditorTags();
        
        if (chiefEditorSelect) {
            chiefEditorSelect.setSelected([]);
        }
        if (associateEditorSelect) {
            associateEditorSelect.setSelected([]);
        }
        if (reviewPolicySelect) {
            reviewPolicySelect.setSelected('');
        }
        if (currencySelect) {
            currencySelect.setSelected('NGN');
        }
        
        // Clear any custom select displays
        document.querySelectorAll('.custom-select .selected-value').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
        document.querySelectorAll('.custom-select .placeholder').forEach(el => {
            el.style.display = 'inline';
        });
        
        // Reset the currency input and symbols
        if (currencyInput) {
            currencyInput.value = 'NGN';
        }
        updateCurrencySymbols('NGN');
    };

    // Form submission
    journalForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate form - show only first error
        const error = getFirstError();
        if (error) {
            showSingleError(error);
            return;
        }

        // Get form data
        const formData = {
            title: document.getElementById('journalTitle').value.trim(),
            issn: document.getElementById('journalIssn').value.trim(),
            description: document.getElementById('journalDescription').value.trim(),
            publisher: document.getElementById('journalPublisher').value.trim(),
            editorsInChief: JSON.parse(editorsInChiefInput.value),
            associateEditors: JSON.parse(associateEditorsInput.value),
            reviewPolicy: reviewPolicySelect.getValue(),
            submissionFee: parseFloat(document.getElementById('submissionFee').value) || 0,
            publicationFee: parseFloat(document.getElementById('publicationFee').value) || 0,
            currency: currencySelect.getValue(),
            email: document.getElementById('journalEmail').value.trim()
        };

        // Optional fields - only add if they have values
        const scope = document.getElementById('journalScope').value.trim();
        if (scope) formData.scope = scope;

        const doiPrefix = document.getElementById('journalDoiPrefix').value.trim();
        if (doiPrefix) formData.doiPrefix = doiPrefix;

        const website = document.getElementById('journalWebsite').value.trim();
        if (website) formData.website = website;

        // Handle indexing - only add if there's valid data
        const indexingDataValue = indexingData.value;
        if (indexingDataValue && indexingDataValue.trim() !== '[]') {
            try {
                const indexing = JSON.parse(indexingDataValue);
                if (Array.isArray(indexing) && indexing.length > 0) {
                    formData.indexing = indexing;
                }
            } catch (e) {
                console.error('Error parsing indexing data for submission:', e);
            }
        }

        try {
            // Show loading state
            const submitBtn = journalForm.querySelector('.submit-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            submitBtn.disabled = true;

            // Submit to API
            const result = await submitJournalData(formData);
            
            // Reset button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;

            // Show success message with SweetAlert
            Swal.fire({
                title: 'Success!',
                text: 'Journal created successfully!',
                icon: 'success',
                confirmButtonText: 'OK',
                confirmButtonColor: '#cc5500'
            }).then(() => {
                resetForm();
            });
            
            console.log('Journal created:', result);
            
        } catch (error) {
            // Reset button state
            const submitBtn = journalForm.querySelector('.submit-btn');
            submitBtn.innerHTML = 'Create Journal';
            submitBtn.disabled = false;
            
            showSingleError(error.message || 'Failed to create journal. Please try again.');
            console.error('Error creating journal:', error);
        }
    });

    // Cancel button with SweetAlert confirmation - ONLY SWEETALERT
    document.querySelector('.cancel-btn').addEventListener('click', function() {
        Swal.fire({
            title: 'Are you sure?',
            text: 'Any unsaved changes will be lost.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#cc5500',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, clear form',
            cancelButtonText: 'No, keep editing'
        }).then((result) => {
            if (result.isConfirmed) {
                resetForm();
                // Only SweetAlert, no toastr
                Swal.fire({
                    title: 'Cleared!',
                    text: 'The form has been cleared.',
                    icon: 'success',
                    confirmButtonColor: '#cc5500',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    });

    // Initialize
    renderIndexingDisplay();
    renderEditorTags();
    updateCurrencySymbols('NGN');
    
    // Set default currency
    setTimeout(() => {
        if (currencySelect) {
            currencySelect.setSelected('NGN');
        }
    }, 100);
});