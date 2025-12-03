// editor-submissions.js
import { BASE_URL, getAuthToken2, createCustomSelect } from '../../assets/js/utility.js';

class EditorSubmissionsManager {
    constructor() {
        this.currentPage = 1;
        this.limit = 6; // Cards per page
        this.totalItems = 0;
        this.totalPages = 0;
        this.allSubmissions = []; // Store all enriched submissions
        this.filteredSubmissions = [];
        this.currentFilters = {
            status: 'all',
            sortBy: 'newest'
        };
        
        // Cache for user and journal details to avoid redundant API calls
        this.userCache = new Map();
        this.journalCache = new Map();
        
        // Keep track of journals for this editor
        this.editorJournals = [];
        
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('DOMContentLoaded', async () => {
            // Create custom select components
            this.createFilterComponents();
            
            // Initialize
            await this.initialize();
        });
    }

    // Create custom select components for filters
    createFilterComponents() {
        // Create containers for custom selects
        const filterControls = document.querySelector('.filter-controls');
        
        if (!filterControls) return;
        
        // Status filter - get the existing select element
        const statusSelectElement = document.getElementById('statusFilter');
        if (statusSelectElement) {
            const statusGroup = statusSelectElement.closest('.filter-group');
            if (statusGroup) {
                const statusContainer = document.createElement('div');
                statusContainer.id = 'statusFilterContainer';
                statusSelectElement.replaceWith(statusContainer);
                
                // Initialize custom select
                this.statusSelect = createCustomSelect({
                    container: statusContainer,
                    placeholder: 'All Submissions',
                    options: [
                        { value: 'all', label: 'All Submissions' },
                        { value: 'submitted', label: 'Submitted' },
                        { value: 'under_review', label: 'Under Review' },
                        { value: 'reviewed', label: 'Reviewed' },
                        { value: 'accepted', label: 'Accepted' },
                        { value: 'rejected', label: 'Rejected' }
                    ],
                    onSelect: (selected) => {
                        this.currentFilters.status = selected.value;
                    }
                });
            }
        }
        
        // Sort by filter - get the existing select element
        const sortSelectElement = document.getElementById('sortBy');
        if (sortSelectElement) {
            const sortGroup = sortSelectElement.closest('.filter-group');
            if (sortGroup) {
                const sortContainer = document.createElement('div');
                sortContainer.id = 'sortByContainer';
                sortSelectElement.replaceWith(sortContainer);
                
                // Initialize custom select
                this.sortSelect = createCustomSelect({
                    container: sortContainer,
                    placeholder: 'Newest First',
                    options: [
                        { value: 'newest', label: 'Newest First' },
                        { value: 'oldest', label: 'Oldest First' },
                        { value: 'title', label: 'Title A-Z' }
                    ],
                    onSelect: (selected) => {
                        this.currentFilters.sortBy = selected.value;
                    }
                });
            }
        }
        
        // Update event listeners for filter buttons
        document.getElementById('applyFilters')?.addEventListener('click', () => this.applyFilters());
        document.getElementById('clearFilters')?.addEventListener('click', () => this.clearFilters());
    }

    async initialize() {
        this.showLoading();
        
        try {
            // Step 1: Get all journals where editor is assigned
            this.editorJournals = await this.fetchEditorJournals();
            
            if (this.editorJournals.length === 0) {
                this.showNoJournalsMessage();
                return;
            }
            
            // Step 2: Get submissions from all journals
            const rawSubmissions = await this.fetchAllSubmissions();
            
            // Step 3: Enrich submissions with journal and author details
            this.allSubmissions = await this.enrichSubmissions(rawSubmissions);
            
            // Step 4: Update counts and render
            this.totalItems = this.allSubmissions.length;
            this.totalPages = Math.ceil(this.totalItems / this.limit);
            
            this.applyFilters(); // This will trigger render
            
        } catch (error) {
            console.error('Error initializing:', error);
            this.showError('Failed to load submissions. Please try again.');
        }
    }

    // Fetch all journals where editor is assigned
    async fetchEditorJournals() {
        try {
            const token = getAuthToken2();
            const response = await fetch(`${BASE_URL}/editor/journals`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch journals: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch journals');
            }
            
            // Transform to array of journal IDs
            return Array.isArray(data.journals) ? data.journals : [];
            
        } catch (error) {
            console.error('Error fetching editor journals:', error);
            return [];
        }
    }

    // Fetch submissions from all journals in parallel
    async fetchAllSubmissions() {
        if (this.editorJournals.length === 0) return [];
        
        // Create promises for each journal
        const submissionPromises = this.editorJournals.map(journal => {
            const journalId = journal._id || journal;
            return this.fetchSubmissionsForJournal(journalId);
        });
        
        try {
            // Execute all in parallel
            const results = await Promise.allSettled(submissionPromises);
            
            // Combine all submissions from all journals
            let allSubmissions = [];
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    allSubmissions = allSubmissions.concat(result.value);
                } else {
                    console.warn(`Failed to fetch submissions for journal ${this.editorJournals[index]}:`, result.reason);
                }
            });
            
            return allSubmissions;
            
        } catch (error) {
            console.error('Error fetching all submissions:', error);
            return [];
        }
    }

    // Fetch submissions for a specific journal
    async fetchSubmissionsForJournal(journalId) {
        try {
            const token = getAuthToken2();
            const response = await fetch(
                `${BASE_URL}/editor/submissions?journalId=${journalId}&page=${this.currentPage}&limit=100`, // Increased limit to get all
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error(`Failed to fetch submissions for journal ${journalId}: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch submissions');
            }
            
            // Add journalId to each submission for reference
            return data.submissions.map(sub => ({
                ...sub,
                journalId // Ensure journalId is set
            }));
            
        } catch (error) {
            console.error(`Error fetching submissions for journal ${journalId}:`, error);
            return [];
        }
    }

    // Enrich submissions with journal and author details
    async enrichSubmissions(submissions) {
        if (!submissions || submissions.length === 0) return [];
        
        // Get unique journal IDs and author IDs
        const uniqueJournalIds = [...new Set(submissions.map(s => s.journalId).filter(Boolean))];
        const uniqueAuthorIds = [...new Set(submissions.map(s => s.createdBy?._id).filter(Boolean))];
        
        // Fetch journal and author details in parallel
        const [journalsData, authorsData] = await Promise.all([
            this.fetchJournalsDetails(uniqueJournalIds),
            this.fetchUsersDetails(uniqueAuthorIds)
        ]);
        
        // Update cache
        journalsData.forEach(journal => this.journalCache.set(journal._id, journal));
        authorsData.forEach(author => this.userCache.set(author._id, author));
        
        // Enrich each submission
        return submissions.map(submission => {
            const journal = this.journalCache.get(submission.journalId);
            const author = this.userCache.get(submission.createdBy?._id);
            
            return {
                ...submission,
                journalName: journal?.title || 'Journal N/A',
                createdBy: {
                    ...submission.createdBy,
                    name: author?.fullName || author?.name || submission.createdBy?.email || 'Unknown'
                }
            };
        });
    }

    // Fetch details for multiple journals
    async fetchJournalsDetails(journalIds) {
        if (!journalIds.length) return [];
        
        const promises = journalIds.map(id => this.fetchJournalDetail(id));
        const results = await Promise.allSettled(promises);
        
        return results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value)
            .filter(journal => journal); // Remove null/undefined
    }

    // Fetch single journal detail
    async fetchJournalDetail(journalId) {
        // Check cache first
        if (this.journalCache.has(journalId)) {
            return this.journalCache.get(journalId);
        }
        
        try {
            const token = getAuthToken2();
            const response = await fetch(`${BASE_URL}/journal/${journalId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.warn(`Failed to fetch journal ${journalId}: ${response.status}`);
                return null;
            }
            
            const data = await response.json();
            
            if (!data.success) {
                console.warn(`Failed to fetch journal ${journalId}:`, data.message);
                return null;
            }
            
            return data.journal || data.data;
            
        } catch (error) {
            console.error(`Error fetching journal ${journalId}:`, error);
            return null;
        }
    }

    // Fetch details for multiple users
    async fetchUsersDetails(userIds) {
        if (!userIds.length) return [];
        
        const promises = userIds.map(id => this.fetchUserDetail(id));
        const results = await Promise.allSettled(promises);
        
        return results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value)
            .filter(user => user); // Remove null/undefined
    }

    // Fetch single user detail
    async fetchUserDetail(userId) {
        // Check cache first
        if (this.userCache.has(userId)) {
            return this.userCache.get(userId);
        }
        
        try {
            const token = getAuthToken2();
            const response = await fetch(`${BASE_URL}/user/${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.warn(`Failed to fetch user ${userId}: ${response.status}`);
                return null;
            }
            
            const data = await response.json();
            
            if (!data.success) {
                console.warn(`Failed to fetch user ${userId}:`, data.message);
                return null;
            }
            
            return data.user || data.data;
            
        } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            return null;
        }
    }

    // Apply filters and sorting
    applyFilters() {
        let filtered = [...this.allSubmissions];

        // Apply status filter
        if (this.currentFilters.status !== 'all') {
            filtered = filtered.filter(sub => sub.status === this.currentFilters.status);
        }

        // Apply sorting
        switch (this.currentFilters.sortBy) {
            case 'oldest':
                filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'title':
                filtered.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'newest':
            default:
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
        }

        this.filteredSubmissions = filtered;
        this.totalItems = filtered.length;
        this.totalPages = Math.ceil(this.totalItems / this.limit);
        
        // Reset to page 1 when filtering
        this.currentPage = 1;
        
        this.renderSubmissions();
        this.renderPagination();
    }

    // Clear all filters
    clearFilters() {
        this.currentFilters = {
            status: 'all',
            sortBy: 'newest'
        };
        
        // Reset custom selects
        if (this.statusSelect) {
            this.statusSelect.setSelected('all');
        }
        if (this.sortSelect) {
            this.sortSelect.setSelected('newest');
        }
        
        this.applyFilters();
    }

    // Render submissions in the grid
    renderSubmissions() {
        const cardsGrid = document.getElementById('cardsGrid');
        
        // Calculate which submissions to show based on current page
        const startIndex = (this.currentPage - 1) * this.limit;
        const endIndex = startIndex + this.limit;
        const submissionsToShow = this.filteredSubmissions.slice(startIndex, endIndex);
        
        if (submissionsToShow.length === 0) {
            cardsGrid.innerHTML = `
                <div class="alert alert-info" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                    <i class="fas fa-search fa-2x" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3>No submissions found</h3>
                    <p>${this.allSubmissions.length === 0 ? 'No submissions in your journals yet.' : 'No submissions match your current filters.'}</p>
                    ${this.allSubmissions.length > 0 ? `
                        <button class="retry-btn" onclick="editorSubmissions.clearFilters()" 
                            style="background: var(--primary); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; margin-top: 1rem;">
                            Clear Filters
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();
        submissionsToShow.forEach(submission => {
            fragment.appendChild(this.createCardMarkup(submission));
        });
        
        cardsGrid.innerHTML = '';
        cardsGrid.appendChild(fragment);
    }

    // Create individual card markup for editor
    createCardMarkup(submission) {
        const card = document.createElement('article');
        card.className = 'manuscript-card editor-card';
        
        // Truncate long titles and journal names
        const truncatedTitle = this.truncateText(submission.title, 60);
        const truncatedJournal = this.truncateText(submission.journalName, 40);
        
        // Determine status color
        const statusColor = this.getStatusColor(submission.status);
        
        // Format reviewers
        const reviewers = submission.assignedReviewers || [];
        const hasReviewers = reviewers.length > 0;
        
        card.innerHTML = `
            <div class="card-header-row">
                <div style="flex:1; min-width:0">
                    <h3 class="card-title" title="${this.escapeHtml(submission.title)}">
                        ${this.escapeHtml(truncatedTitle)}
                    </h3>
                    <div class="card-sub">
                        <strong>Journal:</strong> 
                        <span title="${this.escapeHtml(submission.journalName)}">
                            ${this.escapeHtml(truncatedJournal)}
                        </span>
                    </div>
                </div>
                <div class="status-badge" style="background-color: ${statusColor}">
                    ${this.formatStatus(submission.status)}
                </div>
            </div>

            <div class="meta-row">
                <div>
                    <div class="meta"><strong>Authors:</strong> ${this.formatAuthors(submission.authors)}</div>
                    <div class="meta"><strong>Submitted by:</strong> ${this.escapeHtml(submission.createdBy?.name || 'N/A')}</div>
                </div>

                <div class="reviewers-section">
                    <div class="reviewers-header">
                        <strong>Reviewers:</strong>
                        ${hasReviewers ? '' : '<span class="not-assigned">Not Assigned</span>'}
                    </div>
                    <div class="reviewers-list">
                        ${hasReviewers 
                            ? this.formatReviewers(reviewers)
                            : `<a href="submission-details.html?id=${submission._id}" class="assign-link">Assign Reviewer</a>`
                        }
                    </div>
                </div>
                
                <div class="card-actions">
                    <button class="btn-view" onclick="editorSubmissions.viewSubmission('${submission._id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>

            <div class="card-bottom">
                <div class="submitted-text">
                    Submitted: ${this.formatDate(submission.createdAt)}
                </div>
            </div>
        `;
        
        return card;
    }

    // Helper to truncate text with ellipsis
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Get status color
    getStatusColor(status) {
        const colors = {
            'submitted': '#3b82f6',    // Blue
            'under_review': '#f59e0b',  // Amber
            'reviewed': '#8b5cf6',      // Violet
            'accepted': '#10b981',      // Emerald
            'rejected': '#ef4444'       // Red
        };
        return colors[status] || '#6b7280'; // Gray for unknown
    }

    // Format reviewers
    formatReviewers(reviewers) {
        if (!reviewers || !Array.isArray(reviewers)) return 'N/A';
        return reviewers
            .map(reviewer => this.escapeHtml(reviewer.name))
            .join(', ');
    }

    // Format status for display
    formatStatus(status) {
        const statusMap = {
            'submitted': 'Submitted',
            'under_review': 'Under Review',
            'reviewed': 'Reviewed',
            'accepted': 'Accepted',
            'rejected': 'Rejected'
        };
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
    }

    // Render pagination
    renderPagination() {
        const paginationContainer = document.getElementById('pagination');
        
        if (this.totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }

        let paginationHTML = `
            <div class="pagination-info">
                Showing ${((this.currentPage - 1) * this.limit) + 1} to ${Math.min(this.currentPage * this.limit, this.totalItems)} 
                of ${this.totalItems} submissions
            </div>
            <div class="pagination-controls">
        `;

        // Previous button
        paginationHTML += `
            <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} 
                onclick="editorSubmissions.changePage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= this.totalPages; i++) {
            if (i === 1 || i === this.totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `
                    <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="editorSubmissions.changePage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
        }

        // Next button
        paginationHTML += `
            <button class="pagination-btn" ${this.currentPage === this.totalPages ? 'disabled' : ''} 
                onclick="editorSubmissions.changePage(${this.currentPage + 1})">
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;

        paginationHTML += '</div>';
        paginationContainer.innerHTML = paginationHTML;
        paginationContainer.style.display = 'flex';
    }

    // Change page (without scroll to top)
    changePage(page) {
        this.currentPage = page;
        this.renderSubmissions();
        this.renderPagination();
    }

    // View submission details
    viewSubmission(submissionId) {
        window.location.href = `submission-details.html?id=${submissionId}`;
    }

    // Utility function to format authors
    formatAuthors(authors) {
        if (!authors || !Array.isArray(authors)) return 'N/A';
        return authors.map(author => this.escapeHtml(author.name)).join(', ');
    }

    // Utility function to format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Show loading state
    showLoading() {
        const cardsGrid = document.getElementById('cardsGrid');
        cardsGrid.innerHTML = `
            <div class="loading-screen" style="grid-column: 1 / -1; display: flex; justify-content: center; align-items: center; height: 300px; flex-direction: column; gap: 1rem;">
                <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p>Loading submissions...</p>
            </div>
        `;
        
        // Hide summary stats if they exist
        const summaryStats = document.querySelector('.summary-stats');
        if (summaryStats) {
            summaryStats.style.display = 'none';
        }
    }

    // Show no journals message
    showNoJournalsMessage() {
        const cardsGrid = document.getElementById('cardsGrid');
        cardsGrid.innerHTML = `
            <div class="alert alert-info" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <i class="fas fa-journal-whills fa-2x" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3>No Journals Assigned</h3>
                <p>You are not assigned as an editor to any journals yet.</p>
            </div>
        `;
        
        // Hide summary stats if they exist
        const summaryStats = document.querySelector('.summary-stats');
        if (summaryStats) {
            summaryStats.style.display = 'none';
        }
    }

    // Show error state
    showError(message) {
        const cardsGrid = document.getElementById('cardsGrid');
        cardsGrid.innerHTML = `
            <div class="error-screen" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--muted);">
                <i class="fas fa-exclamation-triangle fa-2x" style="margin-bottom: 1rem; color: var(--danger);"></i>
                <h3>Failed to load submissions</h3>
                <p>${message}</p>
                <button class="retry-btn" onclick="editorSubmissions.initialize()" 
                    style="background: var(--primary); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; margin-top: 1rem;">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
        
        // Hide summary stats if they exist
        const summaryStats = document.querySelector('.summary-stats');
        if (summaryStats) {
            summaryStats.style.display = 'none';
        }
    }

    // Utility function to escape HTML
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

// Initialize editor submissions manager
let editorSubmissions = new EditorSubmissionsManager();