// API Configuration
const API_BASE_URL = 'https://fp.247laboratory.net/';
const API_ENDPOINTS = {
    JOURNALS: 'api/v1/journal',
    JOURNAL_DETAILS: 'api/v1/journal'
};

// Get token from localStorage
function getAuthToken() {
    return localStorage.getItem('pilot_tkn');
}

// Fetch journals from API
async function fetchJournals(page = 1, limit = 9) {
    const token = getAuthToken();
    
    if (!token) {
        Swal.fire({
            title: 'Authentication Required',
            text: 'Please login to view journals',
            icon: 'warning',
            confirmButtonColor: '#cc5500'
        }).then(() => {
            window.location.href = 'login.html';
        });
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.JOURNALS}?page=${page}&limit=${limit}`, {
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

        return await response.json();
    } catch (error) {
        console.error('Error fetching journals:', error);
        Swal.fire({
            title: 'Error',
            text: 'Failed to load journals. Please try again.',
            icon: 'error',
            confirmButtonColor: '#cc5500'
        });
        return null;
    }
}

// Search journals
async function searchJournals(query) {
    const token = getAuthToken();
    
    if (!token) {
        return [];
    }

    try {
        // If API has a dedicated search endpoint, use it
        // Otherwise, fetch all and filter client-side
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.JOURNALS}?page=1&limit=100`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Search API error:', response.status);
            return [];
        }

        const data = await response.json();
        const journals = data.journals || data.data || [];
        
        // Filter journals client-side based on search query
        const searchLower = query.toLowerCase();
        return journals.filter(journal => {
            const title = (journal.title || '').toLowerCase();
            const issn = (journal.issn || '').toLowerCase();
            const publisher = (journal.publisher || '').toLowerCase();
            const description = (journal.description || '').toLowerCase();
            const scope = (journal.scope || '').toLowerCase();
            
            return title.includes(searchLower) || 
                   issn.includes(searchLower) ||
                   publisher.includes(searchLower) ||
                   description.includes(searchLower) ||
                   scope.includes(searchLower);
        });
    } catch (error) {
        console.error('Error searching journals:', error);
        return [];
    }
}

// Get journal details by ID
async function getJournalDetails(journalId) {
    const token = getAuthToken();
    
    if (!token) {
        Swal.fire({
            title: 'Authentication Required',
            text: 'Please login to view journal details',
            icon: 'warning',
            confirmButtonColor: '#cc5500'
        }).then(() => {
            window.location.href = 'login.html';
        });
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.JOURNAL_DETAILS}/${journalId}`, {
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

        return await response.json();
    } catch (error) {
        console.error('Error fetching journal details:', error);
        Swal.fire({
            title: 'Error',
            text: 'Failed to load journal details. Please try again.',
            icon: 'error',
            confirmButtonColor: '#cc5500'
        });
        return null;
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Truncate text
function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Render journal card
function renderJournalCard(journal) {
    const editors = journal.editorsInChief || [];
    const editorNames = editors.map(editor => 
        `${editor.firstName || ''} ${editor.lastName || ''}`.trim() || editor.email
    );

    return `
        <div class="journal-card" data-id="${journal._id}">
            <div class="journal-header">
                <h3 class="journal-title">${journal.title || 'Untitled Journal'}</h3>
                <span class="journal-issn">${journal.issn || 'No ISSN'}</span>
            </div>
            <div class="journal-body">
                <p class="journal-description">${truncateText(journal.description || 'No description available', 120)}</p>
                <div class="journal-meta">
                    <div class="meta-item">
                        <i class="fas fa-building"></i>
                        <span class="meta-label">Publisher:</span>
                        <span class="meta-value">${journal.publisher || 'N/A'}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-tags"></i>
                        <span class="meta-label">Scope:</span>
                        <span class="meta-value">${journal.scope || 'N/A'}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-user-edit"></i>
                        <span class="meta-label">Editors:</span>
                        <div class="editor-list">
                            ${editorNames.slice(0, 2).map(name => 
                                `<span class="editor-tag">${name}</span>`
                            ).join('')}
                            ${editorNames.length > 2 ? 
                                `<span class="editor-tag">+${editorNames.length - 2} more</span>` : 
                                ''
                            }
                        </div>
                    </div>
                </div>
            </div>
            <div class="journal-footer">
                <div class="journal-date">
                    <small>Created: ${formatDate(journal.createdAt)}</small>
                </div>
                <div class="journal-actions">
                    <button class="action-btn view-btn view-more-btn" data-id="${journal._id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="action-btn edit-btn edit-journal-btn" data-id="${journal._id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Render pagination
function renderPagination(currentPage, totalPages) {
    if (totalPages <= 1) return '';

    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button class="page-btn prev-btn ${currentPage === 1 ? 'disabled' : ''}" 
                ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
                ${i}
            </button>
        `;
    }

    // Next button
    paginationHTML += `
        <button class="page-btn next-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    return paginationHTML;
}

// Render empty state
function renderEmptyState() {
    return `
        <div class="empty-state">
            <i class="fas fa-book-open"></i>
            <h3>No Journals Found</h3>
            <p>There are no journals available. Create your first journal to get started.</p>
            <a href="create-journal.html" class="create-btn" style="display: inline-flex; width: auto;">
                <i class="fas fa-plus"></i> Create Journal
            </a>
        </div>
    `;
}

// Render search results
function renderSearchResults(journals) {
    if (!journals || journals.length === 0) {
        return `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>No journals found matching your search</p>
            </div>
        `;
    }

    return journals.map(journal => `
        <div class="search-result-item" data-id="${journal._id}">
            <div class="search-result-title">${journal.title || 'Untitled Journal'}</div>
            <div class="search-result-issn">${journal.issn || 'No ISSN'}</div>
            <div class="search-result-publisher" style="font-size: 13px; color: #666; margin-top: 3px;">
                ${journal.publisher || ''}
            </div>
        </div>
    `).join('');
}

// Main application
document.addEventListener('DOMContentLoaded', async function() {
    // DOM Elements
    const journalsGrid = document.getElementById('journalsGrid');
    const pagination = document.getElementById('pagination');
    const searchModal = document.getElementById('searchModal');
    const openSearchModalBtn = document.getElementById('openSearchModal');
    const closeSearchModalBtn = document.getElementById('closeSearchModal');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    // State
    let currentPage = 1;
    let totalPages = 1;
    let searchTimeout = null;

    // Load initial journals
    await loadJournals(currentPage);

    // Open search modal
    openSearchModalBtn.addEventListener('click', () => {
        searchModal.classList.add('active');
        searchInput.focus();
    });

    // Close search modal
    closeSearchModalBtn.addEventListener('click', () => {
        searchModal.classList.remove('active');
        searchInput.value = '';
        searchResults.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>Type in the search box to find journals</p>
            </div>
        `;
    });

    // Close modal when clicking outside
    searchModal.addEventListener('click', (e) => {
        if (e.target === searchModal) {
            searchModal.classList.remove('active');
            searchInput.value = '';
            searchResults.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Type in the search box to find journals</p>
                </div>
            `;
        }
    });

    // Search input handler with debounce
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        // If query is empty, show placeholder
        if (!query) {
            searchResults.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Type in the search box to find journals</p>
                </div>
            `;
            return;
        }

        // Show loading
        searchResults.innerHTML = `
            <div class="loading" style="padding: 20px;">
                <div class="loading-spinner" style="width: 30px; height: 30px;"></div>
            </div>
        `;

        // Set new timeout for search
        searchTimeout = setTimeout(async () => {
            const results = await searchJournals(query);
            searchResults.innerHTML = renderSearchResults(results);
        }, 500); // 500ms debounce
    });

    // Handle search result click
    searchResults.addEventListener('click', (e) => {
        const resultItem = e.target.closest('.search-result-item');
        if (resultItem) {
            const journalId = resultItem.getAttribute('data-id');
            // Close modal
            searchModal.classList.remove('active');
            searchInput.value = '';
            
            // Navigate to journal details page
            window.location.href = `journal-details.html?id=${journalId}`;
        }
    });

    // Handle pagination clicks
    pagination.addEventListener('click', async (e) => {
        if (e.target.classList.contains('page-btn')) {
            const btn = e.target;
            
            if (btn.classList.contains('disabled')) return;
            
            if (btn.classList.contains('prev-btn')) {
                currentPage--;
            } else if (btn.classList.contains('next-btn')) {
                currentPage++;
            } else if (btn.hasAttribute('data-page')) {
                currentPage = parseInt(btn.getAttribute('data-page'));
            }
            
            await loadJournals(currentPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Handle view more button click
    journalsGrid.addEventListener('click', (e) => {
        // Check if clicked element or parent is the view button
        const viewButton = e.target.closest('.view-more-btn');
        if (viewButton) {
            const journalId = viewButton.getAttribute('data-id');
            // Remove the modal call, just redirect
            window.location.href = `journal-details.html?id=${journalId}`;
            return;
        }
        
        // Handle edit button
        const editButton = e.target.closest('.edit-journal-btn');
        if (editButton) {
            const journalId = editButton.getAttribute('data-id');
            editJournal(journalId);
        }
    });

    // Load journals function
    async function loadJournals(page) {
        // Show loading
        journalsGrid.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
            </div>
        `;

        const response = await fetchJournals(page);
        
        if (!response || !response.success) {
            journalsGrid.innerHTML = renderEmptyState();
            pagination.innerHTML = '';
            return;
        }

        const { journals, total, page: current, pages } = response;
        
        currentPage = current;
        totalPages = pages;

        if (!journals || journals.length === 0) {
            journalsGrid.innerHTML = renderEmptyState();
        } else {
            journalsGrid.innerHTML = journals.map(renderJournalCard).join('');
        }

        pagination.innerHTML = renderPagination(currentPage, totalPages);
    }

    // View journal details
async function viewJournalDetails(journalId) {
    // redirect to journal details page
    window.location.href = `journal-details.html?id=${journalId}`;
}

    // Edit journal
function editJournal(journalId) {
    // redirect to edit journal page with the ID
    window.location.href = `edit-journal.html?id=${journalId}`;
}

    // Handle escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchModal.classList.contains('active')) {
            searchModal.classList.remove('active');
            searchInput.value = '';
            searchResults.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Type in the search box to find journals</p>
                </div>
            `;
        }
    });
});