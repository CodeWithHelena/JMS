import { 
    createCustomSelect, 
    selectOneEditor, 
    selectMultipleEditors, 
    submitScopeData 
} from './utility.js';

import { BASE_URL, token } from '/assets/js/utility.js';

// Define variables in the module scope
let scopeForm;
let chiefEditorSelect;
let associateEditorSelect;
let editorsInChiefArray = [];
let associateEditorsArray = [];



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
    scopeForm = document.getElementById('scopeCreateForm');
    
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


    const chiefEditorSelectContainer = document.getElementById('chiefEditorSelectContainer');
    const associateEditorSelectContainer = document.getElementById('associateEditorSelectContainer');
    const editorsInChiefTags = document.getElementById('editorsInChiefTags');
    const associateEditorsTags = document.getElementById('associateEditorsTags');
    const editorsInChiefInput = document.getElementById('editorsInChief');
    const associateEditorsInput = document.getElementById('associateEditors');


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
        const title = document.getElementById('scopeTitle').value.trim();
        if (!title) return 'Scope title is required';



        const description = document.getElementById('scopeDescription').value.trim();
        if (!description) {
            return 'Description is required';
        } else if (description.length < 10) {
            return 'Description must be at least 10 characters long';
        }

        // Validate at least one Editor-in-Chief
        if (editorsInChiefArray.length === 0) {
            return 'Please add at least one Editor-in-Chief';
        }

        return null; // No errors
    }

    // Reset form function
    window.resetForm = function() {
        if (scopeForm) {
            scopeForm.reset();
        }
        editorsInChiefArray = [];
        associateEditorsArray = [];
        
        renderEditorTags();
        
        if (chiefEditorSelect) {
            chiefEditorSelect.setSelected([]);
        }
        if (associateEditorSelect) {
            associateEditorSelect.setSelected([]);
        }
        
        // Clear any custom select displays
        document.querySelectorAll('.custom-select .selected-value').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
        document.querySelectorAll('.custom-select .placeholder').forEach(el => {
            el.style.display = 'inline';
        });
    };

    // Form submission
    scopeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate form - show only first error
        const error = getFirstError();
        if (error) {
            showSingleError(error);
            return;
        }

        // Get form data
        const formData = {
            title: document.getElementById('scopeTitle').value.trim(),
            description: document.getElementById('scopeDescription').value.trim(),
            editorsInChief: JSON.parse(editorsInChiefInput.value),
            associateEditors: JSON.parse(associateEditorsInput.value)
        };


        try {
            // Show loading state
            const submitBtn = scopeForm.querySelector('.submit-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            submitBtn.disabled = true;

            // Submit to API
            const result = await submitScopeData(formData);
            
            // Reset button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;

            // Show success message with SweetAlert
            Swal.fire({
                title: 'Success!',
                text: 'Scope created successfully!',
                icon: 'success',
                confirmButtonText: 'OK',
                confirmButtonColor: '#cc5500'
            }).then(() => {
                resetForm();
            });
            
            console.log('Scope created:', result);
            
        } catch (error) {
            // Reset button state
            const submitBtn = scopeForm.querySelector('.submit-btn');
            submitBtn.innerHTML = 'Create Scope';
            submitBtn.disabled = false;
            
            showSingleError(error.message || 'Failed to create scope. Please try again.');
            console.error('Error creating scope:', error);
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
    renderEditorTags();
    

});