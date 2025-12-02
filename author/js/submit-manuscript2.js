// submit-manuscript.js
import { initJournalSelect } from '../../assets/js/journal.js';

document.addEventListener('DOMContentLoaded', function () {
    const BASE_URL = 'https://fp.247laboratory.net/';
    const token = localStorage.getItem('token') || null;

    // -------------------------------
    // Quill initialization
    // -------------------------------
    const quill = new Quill('#abstractEditor', {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['clean']
            ]
        }
    });
    
    quill.on('text-change', function () {
        document.getElementById('abstractContent').value = quill.root.innerHTML;
    });

    // -------------------------------
    // Journal Select (using reusable function - no parameters needed!)
    // -------------------------------
    const journalSelect = initJournalSelect();

    // -------------------------------
    // AUTHORS: add/remove logic
    // -------------------------------
    const authorsContainer = document.getElementById("authors-container");

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function createAuthorRow() {
        const row = document.createElement("div");
        row.className = "row g-2 align-items-start mb-3 author-row";

        row.innerHTML = `
            <div class="col-md-5">
                <input type="text" class="form-control fullName" placeholder="Full name" />
                <div class="error-message error-fullname">Full name is required</div>
            </div>
            <div class="col-md-5">
                <input type="email" class="form-control email" placeholder="Email" />
                <div class="error-message error-email">Valid email is required</div>
            </div>
            <div class="col-md-2 d-grid">
                <button type="button" class="btn add-btn w-100">
                    <i class="fas fa-plus"></i> Add
                </button>
            </div>
        `;

        authorsContainer.appendChild(row);

        const addBtn = row.querySelector(".add-btn");
        addBtn.addEventListener("click", () => handleAdd(row));
    }

    function handleAdd(row) {
        // ... (same as before)
    }

    createAuthorRow();

    // -------------------------------
    // FILE UPLOAD
    // -------------------------------
    // ... (same as before)

    // -------------------------------
    // FORM SUBMISSION
    // -------------------------------
    const submitBtn = document.getElementById('submitBtn');

    document.getElementById('submissionForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        // Get selected journal value
        const journalVal = journalSelect ? journalSelect.getSelectedValue() : '';
        const titleVal = document.getElementById('manuscriptTitle').value.trim();
        const abstractText = quill.getText().trim();
        const filePresent = manuscriptFile.files && manuscriptFile.files.length > 0;
        const allRows = Array.from(document.querySelectorAll('.author-row'));
        const addedRows = allRows.filter(r => r.querySelector('.remove-btn'));

        // Validation
        if (!journalVal && !titleVal && !abstractText && !filePresent && addedRows.length === 0) {
            toastr.error('Cannot submit empty field');
            return;
        }

        if (!journalVal) {
            toastr.error('Please select a journal');
            return;
        }

        // ... (rest of validation same as before)

        // Submit logic
        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            const formData = new FormData();
            formData.append('title', titleVal);
            formData.append('abstract', document.getElementById('abstractContent').value || '');
            formData.append('journalId', journalVal);
            
            const authors = addedRows.map(row => ({
                name: row.querySelector('.fullName').value.trim(),
                email: row.querySelector('.email').value.trim()
            }));
            formData.append('authors', JSON.stringify(authors));
            
            formData.append('file', manuscriptFile.files[0]);

            const res = await fetch(`${BASE_URL}/api/v1/submissions`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            // ... (rest of submission logic)

        } catch (err) {
            // ... (error handling)
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
        }
    });

    // Function to reset form
    function resetForm() {
        if (journalSelect) {
            journalSelect.clearSelection();
        }
        document.getElementById('manuscriptTitle').value = '';
        quill.setText('');
        document.getElementById('abstractContent').value = '';
        manuscriptFile.value = '';
        filePreview.style.display = 'none';
        fileError.style.display = 'none';
        authorsContainer.innerHTML = '';
        createAuthorRow();
    }
});