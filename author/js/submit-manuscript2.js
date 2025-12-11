// submit-manuscript2.js
document.addEventListener('DOMContentLoaded', function () {
    // -------------------------------
    // Config: base URL and token
    // -------------------------------
    const BASE_URL = 'https://fp.247laboratory.net/'; // base URL
    const token = localStorage.getItem('token') || null;

    // -------------------------------
    // Reusable: fetch journals
    // -------------------------------
    async function getJournals() {
        try {
            const url = new URL('api/v1/journal/shallow', BASE_URL).toString();
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            if (!res.ok) {
                console.error('Failed to fetch journals', res.status, res.statusText);
                return [];
            }

            const payload = await res.json();
            if (Array.isArray(payload)) return payload;
            if (Array.isArray(payload.data)) return payload.data;
            if (Array.isArray(payload.journals)) return payload.journals;
            const arr = Object.values(payload).find(v => Array.isArray(v));
            if (Array.isArray(arr)) return arr;
            return [];
        } catch (err) {
            console.error('Error fetching journals:', err);
            return [];
        }
    }
    window.getJournals = getJournals;

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
    // Custom select logic (journals)
    // -------------------------------
    const journalSelect = document.getElementById('journalSelect');
    const selectHeader = journalSelect.querySelector('.select-header');
    const selectDropdown = journalSelect.querySelector('.select-dropdown');
    const selectArrow = journalSelect.querySelector('.select-arrow');
    const journalSearch = document.getElementById('journalSearch');
    const searchClear = journalSelect.querySelector('.search-clear');
    const journalOptions = document.getElementById('journalOptions');
    const selectedJournal = document.getElementById('selectedJournal');

    function getJournalDisplayName(item) {
        if (typeof item === 'string') return item;
        if (!item) return '';
        return item.title || item.name || item.journalName || item.shortTitle || item._id || JSON.stringify(item);
    }

    function getJournalId(item) {
        if (!item) return '';
        if (typeof item === 'string') return item; // fallback: use name as id
        return item._id || item.id || getJournalDisplayName(item);
    }

    function populateJournalOptions(filter = '') {
        journalOptions.innerHTML = '';
        const filtered = journalsCache.filter(j =>
            getJournalDisplayName(j).toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'select-option';
            noResults.textContent = 'No journals found';
            noResults.style.color = 'var(--text-light)';
            noResults.style.cursor = 'default';
            journalOptions.appendChild(noResults);
            return;
        }

        filtered.forEach(j => {
            const option = document.createElement('div');
            option.className = 'select-option';
            const name = getJournalDisplayName(j);
            const id = getJournalId(j);
            option.textContent = name;
            option.dataset.jid = id;
            option.addEventListener('click', function () {
                selectHeader.querySelector('.select-placeholder').textContent = name;
                selectedJournal.value = id; // store id (if present) else fallback name
                selectHeader.classList.remove('open');
                selectDropdown.style.display = 'none';
                selectArrow.classList.remove('open');
            });
            journalOptions.appendChild(option);
        });
    }

    let journalsCache = [];

    (async function loadJournalsAndPopulate() {
        const remote = await getJournals();
        if (remote && remote.length) journalsCache = remote;
        populateJournalOptions();
    })();

    selectHeader.addEventListener('click', function () {
        const isOpen = selectHeader.classList.contains('open');

        if (isOpen) {
            selectHeader.classList.remove('open');
            selectDropdown.style.display = 'none';
            selectArrow.classList.remove('open');
        } else {
            selectHeader.classList.add('open');
            selectDropdown.style.display = 'block';
            selectArrow.classList.add('open');
            journalSearch.focus();
        }
    });

    journalSearch.addEventListener('input', function () {
        populateJournalOptions(this.value);
    });

    searchClear.addEventListener('click', function () {
        journalSearch.value = '';
        populateJournalOptions();
        journalSearch.focus();
    });

    document.addEventListener('click', function (e) {
        if (!journalSelect.contains(e.target)) {
            selectHeader.classList.remove('open');
            selectDropdown.style.display = 'none';
            selectArrow.classList.remove('open');
        }
    });

    // -------------------------------
    // AUTHORS: new add/remove model
    // -------------------------------
    const authorsContainer = document.getElementById("authors-container");

    // We'll render two sections inside authorsContainer:
    // 1) addedAuthorsList (visual list of added authors)
    // 2) authorInputArea (the input rows)
    authorsContainer.innerHTML = `
        <div id="addedAuthorsList" class="mb-3"></div>
        <div id="authorInputArea"></div>
    `;

    const addedAuthorsList = document.getElementById('addedAuthorsList');
    const authorInputArea = document.getElementById('authorInputArea');

    let authorsAdded = []; // {id, name, email}

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function renderAddedAuthors() {
        // Shows the added authors at the top with an X to remove
        addedAuthorsList.innerHTML = '';
        if (authorsAdded.length === 0) {
            // no authors - show nothing (or a subtle hint if desired)
            return;
        }

        authorsAdded.forEach(a => {
            const item = document.createElement('div');
            item.className = 'd-flex align-items-center justify-content-between p-2 mb-2';
            item.style.background = 'var(--body-bg)';
            item.style.border = '1px solid var(--border-color)';
            item.style.borderRadius = '8px';

            item.innerHTML = `
                <div>
                    <strong>${escapeHtml(a.name)}</strong>
                    <div style="font-size:0.9rem;color:var(--text-light)">${escapeHtml(a.email)}</div>
                </div>
                <div>
                    <button type="button" class="btn" data-id="${a.id}" title="Remove author" style="background:none;border:none;color:var(--danger-color)">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            const btn = item.querySelector('button');
            btn.addEventListener('click', function () {
                const id = this.dataset.id;
                authorsAdded = authorsAdded.filter(x => String(x.id) !== String(id));
                renderAddedAuthors();
            });

            addedAuthorsList.appendChild(item);
        });
    }

    // simple HTML escape helper
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>"'`=\/]/g, function (s) {
            return ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '/': '&#x2F;',
                '`': '&#x60;',
                '=': '&#x3D;'
            })[s];
        });
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

        authorInputArea.appendChild(row);

        const addBtn = row.querySelector(".add-btn");
        addBtn.addEventListener("click", () => handleAdd(row));
    }

    function handleAdd(row) {
        const fullNameInput = row.querySelector(".fullName");
        const emailInput = row.querySelector(".email");
        const errorFullname = row.querySelector(".error-fullname");
        const errorEmail = row.querySelector(".error-email");

        // hide previous inline errors
        errorFullname.style.display = "none";
        errorEmail.style.display = "none";

        let hasError = false;

        if (fullNameInput.value.trim() === "") {
            errorFullname.textContent = "Full name is required";
            errorFullname.style.display = "block";
            hasError = true;
        }

        if (emailInput.value.trim() === "") {
            errorEmail.textContent = "Email is required";
            errorEmail.style.display = "block";
            hasError = true;
        } else if (!isValidEmail(emailInput.value.trim())) {
            errorEmail.textContent = "Please enter a valid email address";
            errorEmail.style.display = "block";
            hasError = true;
        }

        if (hasError) {
            // Per your requirement: do not use toastr for add/remove. Only inline errors for the inputs.
            return;
        }

        // Add to the top list
        const authorObj = {
            id: Date.now() + Math.random().toString(36).slice(2, 8),
            name: fullNameInput.value.trim(),
            email: emailInput.value.trim()
        };
        authorsAdded.unshift(authorObj); // add to start so newest appears on top
        renderAddedAuthors();

        // remove the current row from DOM and create a fresh one
        row.remove();
        createAuthorRow();
    }

    // start with one empty row
    createAuthorRow();

    // -------------------------------
    // FILE UPLOAD: preview + remove (no validation triggered by remove)
    // -------------------------------
    const fileUploadArea = document.getElementById('fileUploadArea');
    const manuscriptFile = document.getElementById('manuscriptFile');
    const fileError = document.getElementById('fileError');
    const filePreview = document.getElementById('filePreview');

    fileUploadArea.addEventListener('click', function () {
        manuscriptFile.click();
    });

    manuscriptFile.addEventListener('change', function (e) {
        handleFiles(this.files);
    });

    fileUploadArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        this.classList.add('dragover');
    });

    fileUploadArea.addEventListener('dragleave', function (e) {
        e.preventDefault();
        this.classList.remove('dragover');
    });

    fileUploadArea.addEventListener('drop', function (e) {
        e.preventDefault();
        this.classList.remove('dragover');

        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });

    function handleFiles(files) {
        const file = files[0];
        if (!file) return;

        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

        if (!allowedTypes.includes(file.type)) {
            fileError.style.display = 'block';
            toastr.error('Please upload a PDF or Word document');
            return;
        }

        fileError.style.display = 'none';

        filePreview.innerHTML = `
            <div class="file-preview-item">
                <div class="file-preview-name">
                    <i class="fas fa-file"></i>
                    <span>${escapeHtml(file.name)}</span>
                </div>
                <button type="button" class="file-preview-remove" id="removeFile">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        filePreview.style.display = 'block';

        const removeBtn = document.getElementById('removeFile');
        if (removeBtn) {
            removeBtn.addEventListener('click', function (evt) {
                evt.preventDefault();
                evt.stopPropagation();
                filePreview.style.display = 'none';
                manuscriptFile.value = '';
            });
        }
    }

    // -------------------------------
    // FORM SUBMISSION (with toastr and sweetalert)
    // -------------------------------
    const submitBtn = document.getElementById('submitBtn');

    document.getElementById('submissionForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        // Build list of fields to check to determine if the user left everything blank
        const journalVal = selectedJournal.value && selectedJournal.value.trim();
        const titleVal = document.getElementById('manuscriptTitle').value.trim();
        const abstractText = quill.getText().trim(); // plain text check
        const filePresent = manuscriptFile.files && manuscriptFile.files.length > 0;
        // use authorsAdded array
        const addedAuthorsCount = authorsAdded.length;

        // If everything is empty -> show "cannot submit empty field"
        if (!journalVal && !titleVal && !abstractText && !filePresent && addedAuthorsCount === 0) {
            toastr.error('Cannot submit empty field');
            return;
        }

        // Now check required fields in order, and show only the FIRST missing/invalid one
        // 1. journal
        if (!journalVal) {
            toastr.error('Please select a journal');
            return;
        }

        // 2. title
        if (!titleVal) {
            toastr.error('Please enter a manuscript title');
            return;
        }

        // 3. authors - at least one confirmed author
        if (addedAuthorsCount === 0) {
            toastr.error('Please add at least one author');
            return;
        }

        // 4. validate authors (they should be valid already)
        for (let i = 0; i < authorsAdded.length; i++) {
            const a = authorsAdded[i];
            if (!a.name || !a.name.trim()) {
                toastr.error(`Please enter full name for author #${i + 1}`);
                return;
            }
            if (!a.email || !a.email.trim()) {
                toastr.error(`Please enter email for author #${i + 1}`);
                return;
            }
            if (!isValidEmail(a.email.trim())) {
                toastr.error(`Author #${i + 1} email is invalid`);
                return;
            }
        }

        // 5. file
        if (!filePresent) {
            toastr.error('Please upload a manuscript file');
            return;
        }

        // 6. token presence
        if (!token) {
            toastr.error('Missing authentication token. Please login and try again.');
            return;
        }

        // All validation passed — prepare FormData and submit
        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            const formData = new FormData();
            formData.append('title', titleVal);
            // send HTML abstract
            formData.append('abstract', document.getElementById('abstractContent').value || '');
            // send journalId (selectedJournal holds id when API provided it)
            formData.append('journalId', journalVal);
            // authors: from authorsAdded
            const authorsPayload = authorsAdded.map(a => ({
                name: a.name,
                email: a.email
            }));
            formData.append('authors', JSON.stringify(authorsPayload));
            // file -- key 'file' to match your Postman sample
            formData.append('file', manuscriptFile.files[0]);

            const res = await fetch(`${BASE_URL}/api/v1/submissions`, {
                method: 'POST',
                headers: {
                    // Do NOT set Content-Type when sending FormData — browser sets the boundary
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const respJson = await res.json().catch(() => null);

            // IMPORTANT: show errors in toastr. Success remains in SweetAlert.
            if (!res.ok) {
                const message = (respJson && (respJson.message || respJson.error)) || `Submission failed (status ${res.status})`;
                toastr.error(message);
            } else if (respJson && respJson.success === false) {
                // API returned success:false with 200/ok status
                const message = respJson.message || respJson.error || 'Submission failed';
                toastr.error(message);
            } else {
                // Success
                const message = (respJson && (respJson.message || 'Manuscript submitted successfully')) || 'Manuscript submitted successfully';
                
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: message,
                    confirmButtonColor: '#3085d6'
                }).then(() => {
                    // Reset form after successful submission
                    resetForm();
                });
            }
        } catch (err) {
            console.error('Submit error', err);
            toastr.error('An error occurred while submitting. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
        }
    });

    // Function to reset form to original state
    function resetForm() {
        // Reset journal selection
        selectedJournal.value = '';
        selectHeader.querySelector('.select-placeholder').textContent = 'Select a journal';
        
        // Reset manuscript title
        document.getElementById('manuscriptTitle').value = '';
        
        // Reset abstract editor
        quill.setText('');
        document.getElementById('abstractContent').value = '';
        
        // Reset file upload
        manuscriptFile.value = '';
        filePreview.style.display = 'none';
        fileError.style.display = 'none';
        
        // Reset authors - clear added authors and input area
        authorsAdded = [];
        renderAddedAuthors();
        authorInputArea.innerHTML = '';
        createAuthorRow();
    }
});
