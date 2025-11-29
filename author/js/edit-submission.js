// edit-submission.js
const BASE_URL = 'https://fp.247laboratory.net/';
const token = localStorage.getItem('token') || null;
class EditSubmissionManager {
    constructor() {
        this.submissionId = this.getSubmissionIdFromURL();
        this.initializeToastr();
        this.initializeQuill();
        this.initializeEventListeners();
        this.loadSubmissionData();
    }

    initializeToastr() {
        toastr.options = {
            closeButton: true,
            progressBar: true,
            positionClass: "toast-top-right",
            timeOut: 5000,
            extendedTimeOut: 2000
        };
    }

    getSubmissionIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    initializeQuill() {
        this.quill = new Quill('#abstractEditor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    ['clean']
                ]
            }
        });

        this.quill.on('text-change', () => {
            document.getElementById('abstractContent').value = this.quill.root.innerHTML;
        });
    }

    initializeEventListeners() {
        // File upload event listeners
        const fileUploadArea = document.getElementById('fileUploadArea');
        const manuscriptFile = document.getElementById('manuscriptFile');
        const fileError = document.getElementById('fileError');

        fileUploadArea.addEventListener('click', () => {
            manuscriptFile.click();
        });

        manuscriptFile.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });

        fileUploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
        });

        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                this.handleFiles(e.dataTransfer.files);
            }
        });

        // Form submission
        document.getElementById('editSubmissionForm').addEventListener('submit', (e) => {
            this.handleSubmit(e);
        });
    }

    async loadSubmissionData() {
        if (!this.submissionId) {
            this.showError('No submission ID provided');
            return;
        }

        this.showLoading();

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await fetch(`${BASE_URL}/api/v1/submissions/${this.submissionId}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch submission: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to load submission data');
            }

            this.populateForm(data.submission);
            this.hideLoading();

        } catch (error) {
            console.error('Error loading submission:', error);
            this.showError('Failed to load submission data. Please try again.');
            this.hideLoading();
        }
    }

    populateForm(submission) {
        // Populate title
        document.getElementById('manuscriptTitle').value = submission.title || '';

        // Populate abstract
        if (submission.abstract) {
            this.quill.root.innerHTML = submission.abstract;
            document.getElementById('abstractContent').value = submission.abstract;
        }

        // Display current file
        this.displayCurrentFile(submission.file);

        // Populate any other fields you might add later
    }

    displayCurrentFile(file) {
        const filePreviewCurrent = document.getElementById('filePreviewCurrent');
        
        if (!file || !file.originalName) {
            filePreviewCurrent.innerHTML = `
                <div class="file-preview-item">
                    <div class="file-preview-name">
                        <i class="fas fa-file"></i>
                        <span>No file uploaded</span>
                    </div>
                </div>
            `;
            return;
        }

        filePreviewCurrent.innerHTML = `
            <div class="file-preview-item">
                <div class="file-preview-name">
                    <i class="fas fa-file"></i>
                    <span>${this.escapeHtml(file.originalName)}</span>
                </div>
                <span class="badge bg-secondary">Current File</span>
            </div>
        `;
        filePreviewCurrent.style.display = 'block';
    }

    handleFiles(files) {
        const file = files[0];
        if (!file) return;

        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

        if (!allowedTypes.includes(file.type)) {
            document.getElementById('fileError').style.display = 'block';
            toastr.error('Please upload a PDF or Word document');
            return;
        }

        document.getElementById('fileError').style.display = 'none';

        const filePreview = document.getElementById('filePreview');
        filePreview.innerHTML = `
            <div class="file-preview-item">
                <div class="file-preview-name">
                    <i class="fas fa-file"></i>
                    <span>${file.name}</span>
                </div>
                <button type="button" class="file-preview-remove" id="removeFile">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        filePreview.style.display = 'block';

        const removeBtn = document.getElementById('removeFile');
        if (removeBtn) {
            removeBtn.addEventListener('click', (evt) => {
                evt.preventDefault();
                evt.stopPropagation();
                filePreview.style.display = 'none';
                document.getElementById('manuscriptFile').value = '';
            });
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const titleVal = document.getElementById('manuscriptTitle').value.trim();
        const abstractText = this.quill.getText().trim();
        const filePresent = document.getElementById('manuscriptFile').files.length > 0;

        // Validation logic similar to submit manuscript
        if (!titleVal && !abstractText && !filePresent) {
            toastr.error('No changes detected. Please update at least one field.');
            return;
        }

        // Check required fields if any changes are made
        if (titleVal === '') {
            toastr.error('Please enter a manuscript title');
            return;
        }

        if (abstractText === '') {
            toastr.error('Please enter an abstract');
            return;
        }

        try {
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving Changes...';

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const formData = new FormData();
            formData.append('title', titleVal);
            formData.append('abstract', document.getElementById('abstractContent').value || '');

            // Only append file if a new one is selected
            if (filePresent) {
                formData.append('file', document.getElementById('manuscriptFile').files[0]);
            }

            const response = await fetch(`${BASE_URL}/api/v1/submissions/${this.submissionId}`, {
                method: 'PUT',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const respJson = await response.json().catch(() => null);

            if (!response.ok) {
                const message = (respJson && (respJson.message || respJson.error)) || `Update failed (status ${response.status})`;
                throw new Error(message);
            }

            // Success
            const message = (respJson && (respJson.message || 'Manuscript updated successfully')) || 'Manuscript updated successfully';
            
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: message,
                confirmButtonColor: '#3085d6'
            });

            // Redirect back to submissions page
            window.location.href = '/author/my-submissions.html';

        } catch (error) {
            console.error('Update error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: error.message || 'An error occurred while updating. Please try again.',
                confirmButtonColor: '#d33'
            });
        } finally {
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
        }
    }

    showLoading() {
        // You can add a loading overlay here if needed
        console.log('Loading submission data...');
    }

    hideLoading() {
        console.log('Loading complete');
    }

    showError(message) {
        toastr.error(message, 'Error');
        
        // Optionally show an error state in the form
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            ${message}
            <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="location.reload()">
                <i class="fas fa-redo"></i> Retry
            </button>
        `;
        
        const form = document.getElementById('editSubmissionForm');
        form.prepend(errorDiv);
    }

    escapeHtml(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }
}

// Initialize when DOM is loaded
let editSubmissionManager;

document.addEventListener('DOMContentLoaded', function() {
    editSubmissionManager = new EditSubmissionManager();
});