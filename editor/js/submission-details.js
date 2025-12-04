// submission-details.js
import { BASE_URL, getAuthToken2 } from '../../assets/js/utility.js';

class SubmissionDetailsManager {
    constructor() {
        this.submissionId = this.getSubmissionIdFromURL();
        this.submission = null;
        this.selectedReviewers = [];
        this.reviewerSelect = null;
        this.journalId = null;
        this.allReviewers = [];
        this.userCache = new Map();
        
        if (!this.submissionId) {
            this.showError('No submission ID provided');
            return;
        }
        
        this.initializeToastr();
        this.bindEvents();
        this.initialize();
    }

    initializeToastr() {
        toastr.options = {
            closeButton: false,
            progressBar: false,
            positionClass: "toast-top-right",
            timeOut: 3000,
            extendedTimeOut: 1000
        };
    }

    bindEvents() {
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('assignReviewersBtn')?.addEventListener('click', () => this.assignReviewers());
            document.getElementById('clearSelectionBtn')?.addEventListener('click', () => this.clearSelection());
            document.getElementById('viewTimelineBtn')?.addEventListener('click', () => this.viewTimeline());
        });
    }

    getSubmissionIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    async initialize() {
        this.showLoading();
        
        try {
            await this.loadSubmissionData();
            
            // Get journal ID from submission
            this.journalId = this.submission.journalId?._id;
            
            if (this.journalId) {
                await this.loadAvailableReviewers();
                this.initializeReviewerSelect();
            } else {
                console.error('No journal ID found in submission data');
            }
            
            await this.loadLatestTimelineEvent();
            
            this.hideLoading();
            this.showContent();
            
        } catch (error) {
            console.error('Error initializing:', error);
            this.showError('Failed to load submission details. Please try again.');
        }
    }

    async loadSubmissionData() {
        try {
            const token = getAuthToken2();
            if (!token) {
                throw new Error('Authentication token not found');
            }
            
            const response = await fetch(`${BASE_URL}/submissions/${this.submissionId}`, {
                method: 'GET',
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
            
            this.submission = data.submission;
            
            // Get submitter details from history array
            const submittedEvent = this.submission.history?.find(event => event.status === 'submitted');
            if (submittedEvent?.by) {
                const submitter = await this.getUserDetails(submittedEvent.by);
                if (submitter) {
                    this.submission.submitterName = `${submitter.firstName || ''} ${submitter.lastName || ''}`.trim();
                    this.submission.submitterEmail = submitter.email;
                }
            }
            
            // Get reviewer details for assigned reviewers
            if (this.submission.assignedReviewers && this.submission.assignedReviewers.length > 0) {
                await this.enrichAssignedReviewers();
            }
            
            this.renderManuscriptHeader();
            this.renderAuthors();
            this.renderCurrentReviewers();
            
        } catch (error) {
            console.error('Error loading submission data:', error);
            throw error;
        }
    }

    async getUserDetails(userId) {
        if (this.userCache.has(userId)) {
            return this.userCache.get(userId);
        }
        
        try {
            const token = getAuthToken2();
            if (!token) return null;
            
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
            
            const user = data.user;
            this.userCache.set(userId, user);
            return user;
            
        } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            return null;
        }
    }

    async enrichAssignedReviewers() {
        const assignedReviewers = this.submission.assignedReviewers || [];
        const enrichedReviewers = [];
        
        for (const assignment of assignedReviewers) {
            const reviewerId = assignment.reviewerId;
            
            if (reviewerId) {
                const user = await this.getUserDetails(reviewerId);
                if (user) {
                    enrichedReviewers.push({
                        ...assignment,
                        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                        email: user.email
                    });
                } else {
                    enrichedReviewers.push({
                        ...assignment,
                        name: 'Unknown Reviewer',
                        email: 'N/A'
                    });
                }
            }
        }
        
        this.submission.assignedReviewers = enrichedReviewers;
    }

    async loadAvailableReviewers() {
        try {
            const token = getAuthToken2();
            if (!token || !this.journalId) {
                console.warn('Missing token or journalId for loading reviewers');
                return;
            }
            
            const response = await fetch(`${BASE_URL}/editor/journal-reviewers?journalId=${this.journalId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.warn(`Failed to fetch reviewers: ${response.status}`);
                this.allReviewers = [];
                return;
            }
            
            const data = await response.json();
            
            if (!data.success) {
                console.warn(`Failed to load reviewers:`, data.message);
                this.allReviewers = [];
                return;
            }
            
            // Process reviewers - get user details for each
            const reviewerIds = data.reviewers || [];
            this.allReviewers = [];
            
            const reviewerPromises = reviewerIds.map(async (reviewerId) => {
                const user = await this.getUserDetails(reviewerId);
                if (user) {
                    return {
                        id: user._id,
                        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                        email: user.email
                    };
                }
                return null;
            });
            
            const reviewers = await Promise.all(reviewerPromises);
            this.allReviewers = reviewers.filter(reviewer => reviewer !== null);
            
        } catch (error) {
            console.error('Error loading available reviewers:', error);
            this.allReviewers = [];
        }
    }

    initializeReviewerSelect() {
        const container = document.getElementById('reviewerSearchContainer');
        if (!container) return;
        
        // Create the custom search select
        this.createCustomSearchSelect(container);
    }

    createCustomSearchSelect(container) {
        const selectId = 'reviewerSearchSelect_' + Math.random().toString(36).substr(2, 9);
        
        const html = `
            <div class="custom-search-select" id="${selectId}">
                <div class="select-header">
                    <span class="placeholder">Search for reviewers...</span>
                    <span class="selected-value"></span>
                    <span class="arrow"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="select-dropdown">
                    <div class="search-input-wrapper">
                        <input type="text" class="search-input" placeholder="Search by name or email...">
                        <button type="button" class="clear-search" title="Clear search">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="select-options-list">
                        ${this.renderReviewerOptions(this.allReviewers)}
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Get DOM elements
        const selectElement = document.getElementById(selectId);
        const header = selectElement.querySelector('.select-header');
        const dropdown = selectElement.querySelector('.select-dropdown');
        const searchInput = selectElement.querySelector('.search-input');
        const clearSearchBtn = selectElement.querySelector('.clear-search');
        const optionsList = selectElement.querySelector('.select-options-list');
        const selectedValueSpan = selectElement.querySelector('.selected-value');
        const placeholderSpan = selectElement.querySelector('.placeholder');
        
        // Filter reviewers based on search
        const filterReviewers = (searchTerm) => {
            if (!searchTerm.trim()) {
                optionsList.innerHTML = this.renderReviewerOptions(this.allReviewers);
                clearSearchBtn.classList.remove('visible');
                return;
            }
            
            const searchLower = searchTerm.toLowerCase();
            const filtered = this.allReviewers.filter(reviewer => 
                reviewer.name.toLowerCase().includes(searchLower) ||
                reviewer.email.toLowerCase().includes(searchLower)
            );
            
            optionsList.innerHTML = this.renderReviewerOptions(filtered);
            clearSearchBtn.classList.add('visible');
        };
        
        // Select a reviewer
        const selectReviewer = (reviewer) => {
            const isSelected = this.selectedReviewers.some(r => r.id === reviewer.id);
            if (!isSelected) {
                this.selectedReviewers.push(reviewer);
                this.renderSelectedReviewers();
                this.updateAssignButton();
                
                // Update selected value display
                if (this.selectedReviewers.length === 1) {
                    selectedValueSpan.textContent = reviewer.name;
                    selectedValueSpan.style.display = 'inline';
                    placeholderSpan.style.display = 'none';
                } else {
                    selectedValueSpan.textContent = `${this.selectedReviewers.length} selected`;
                    selectedValueSpan.style.display = 'inline';
                    placeholderSpan.style.display = 'none';
                }
            }
            
            // Close dropdown
            dropdown.classList.remove('active');
            header.classList.remove('active');
        };
        
        // Clear search
        const clearSearch = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            searchInput.value = '';
            filterReviewers('');
            searchInput.focus();
        };
        
        // Event Listeners
        header.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdown.classList.toggle('active');
            header.classList.toggle('active');
            if (dropdown.classList.contains('active')) {
                searchInput.focus();
            }
        });
        
        searchInput.addEventListener('input', (e) => {
            filterReviewers(e.target.value);
        });
        
        clearSearchBtn.addEventListener('click', clearSearch);
        
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
        
        optionsList.addEventListener('click', (e) => {
            e.stopPropagation();
            const optionItem = e.target.closest('.select-option-item');
            if (optionItem) {
                const reviewerId = optionItem.getAttribute('data-id');
                const reviewer = this.allReviewers.find(r => r.id === reviewerId);
                if (reviewer) {
                    selectReviewer(reviewer);
                }
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!selectElement.contains(e.target)) {
                dropdown.classList.remove('active');
                header.classList.remove('active');
            }
        });
        
        // Initial render
        filterReviewers('');
    }

    renderReviewerOptions(reviewers) {
        if (reviewers.length === 0) {
            return '<div class="no-results">No reviewers available for this journal</div>';
        }

        return reviewers.map(reviewer => `
            <div class="select-option-item" data-id="${reviewer.id}">
                <div class="option-text">
                    <span class="option-name">${this.escapeHtml(reviewer.name)}</span>
                    ${reviewer.email ? `<span class="option-email">${this.escapeHtml(reviewer.email)}</span>` : ''}
                </div>
                <div class="add-icon">
                    <i class="fas fa-plus"></i>
                </div>
            </div>
        `).join('');
    }

    async loadLatestTimelineEvent() {
        try {
            const token = getAuthToken2();
            if (!token) return;
            
            const response = await fetch(`${BASE_URL}/submissions/${this.submissionId}/history`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.warn(`Failed to fetch timeline: ${response.status}`);
                this.renderTimeline([]);
                return;
            }
            
            const data = await response.json();
            
            if (!data.success) {
                console.warn(`Failed to load timeline:`, data.message);
                this.renderTimeline([]);
                return;
            }
            
            const timelineData = data.submission || data;
            const history = timelineData.history || [];
            
            // Get the latest event (first in the array based on the API response)
            const latestEvent = history.length > 0 ? history[0] : null;
            
            if (latestEvent) {
                await this.renderLatestTimelineEvent(latestEvent);
            } else {
                this.renderTimeline([]);
            }
            
        } catch (error) {
            console.error('Error loading timeline data:', error);
            this.renderTimeline([]);
        }
    }

    async renderLatestTimelineEvent(event) {
        const timelineContainer = document.getElementById('recentTimeline');
        if (!timelineContainer) return;
        
        let updatedBy = 'System';
        if (event.by) {
            const user = await this.getUserDetails(event.by);
            if (user) {
                updatedBy = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown User';
            }
        }
        
        timelineContainer.innerHTML = `
            <div class="timeline-item">
                <div class="card">
                    <span class="status-badge" style="${this.getStatusStyle(event.status)}">
                        ${this.formatStatus(event.status)}
                    </span>
                    <p class="timeline-comment">${this.escapeHtml(event.comment || 'No comment provided')}</p>
                    <p class="timeline-date">
                        <i class="far fa-clock"></i> ${this.formatDate(event.date)}
                    </p>
                    <div class="updated-by">
                        <strong><i class="fas fa-user"></i> Updated by: ${this.escapeHtml(updatedBy)}</strong>
                    </div>
                </div>
            </div>
        `;
    }

    renderManuscriptHeader() {
        const header = document.getElementById('manuscriptHeader');
        if (!header || !this.submission) return;
        
        const formattedDate = this.formatDate(this.submission.createdAt);
        const statusDisplay = this.formatStatus(this.submission.status);
        const journalName = this.submission.journalId?.title || 'Unknown Journal';
        const journalISSN = this.submission.journalId?.issn || 'N/A';
        const submittedByName = this.submission.submitterName || 'Unknown';
        
        header.innerHTML = `
            <h1>${this.escapeHtml(this.submission.title)}</h1>
            <span class="header-status-badge">${statusDisplay}</span>
            <div class="header-meta">
                <div class="meta-item">
                    <i class="fas fa-book-open"></i>
                    <span>Journal: ${this.escapeHtml(journalName)}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-hashtag"></i>
                    <span>ISSN: ${journalISSN}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-user"></i>
                    <span>Submitted by: ${this.escapeHtml(submittedByName)}</span>
                </div>
                <div class="meta-item">
                    <i class="far fa-calendar"></i>
                    <span>Submitted on: ${formattedDate}</span>
                </div>
            </div>
        `;
    }

    renderAuthors() {
        const authorsList = document.getElementById('authorsList');
        if (!authorsList || !this.submission) return;
        
        const authors = this.submission.authors || [];
        
        if (authors.length === 0) {
            authorsList.innerHTML = '<div class="no-authors">No authors listed</div>';
            return;
        }
        
        authorsList.innerHTML = authors.map(author => `
            <div class="author-item">
                <div class="author-name">${this.escapeHtml(author.name)}</div>
                <div class="author-email">
                    <i class="fas fa-envelope"></i>
                    ${this.escapeHtml(author.email)}
                </div>
            </div>
        `).join('');
    }

    renderCurrentReviewers() {
        const reviewersContainer = document.getElementById('currentReviewers');
        const reviewersCount = document.getElementById('reviewersCount');
        if (!reviewersContainer || !this.submission) return;
        
        const reviewers = this.submission.assignedReviewers || [];
        reviewersCount.textContent = reviewers.length;
        
        if (reviewers.length === 0) {
            reviewersContainer.innerHTML = `
                <div class="no-reviewers">
                    <i class="fas fa-user-slash"></i>
                    <p>No reviewers assigned yet</p>
                </div>
            `;
            return;
        }
        
        reviewersContainer.innerHTML = reviewers.map(reviewer => `
            <div class="reviewer-card">
                <div class="reviewer-name">${this.escapeHtml(reviewer.name)}</div>
                <div class="reviewer-email">
                    <i class="fas fa-envelope"></i>
                    ${this.escapeHtml(reviewer.email)}
                </div>
                <div class="reviewer-status">
                    <span class="status-indicator ${reviewer.hasReviewed ? 'completed' : 'pending'}"></span>
                    ${reviewer.hasReviewed ? 'Review completed' : 'Awaiting review'}
                </div>
            </div>
        `).join('');
        
        // Add "View Progress" button if there are reviewers
        if (reviewers.length > 0 && this.journalId) {
            const viewProgressBtn = document.createElement('div');
            viewProgressBtn.className = 'view-progress-container';
            viewProgressBtn.innerHTML = `
                <button class="btn-view-progress" onclick="window.location.href='reviewer-progress.html?journalId=${this.journalId}'">
                    <i class="fas fa-chart-line"></i> View Progress
                </button>
            `;
            reviewersContainer.appendChild(viewProgressBtn);
        }
    }

    renderSelectedReviewers() {
        const previewContainer = document.getElementById('selectedReviewersPreview');
        const selectedList = document.getElementById('selectedReviewersList');
        const selectedCount = document.getElementById('selectedCount');
        
        if (!this.selectedReviewers.length) {
            previewContainer.style.display = 'none';
            return;
        }
        
        previewContainer.style.display = 'block';
        selectedCount.textContent = this.selectedReviewers.length;
        
        selectedList.innerHTML = this.selectedReviewers.map(reviewer => `
            <div class="selected-reviewer-tag" data-id="${reviewer.id}">
                ${this.escapeHtml(reviewer.name)}
                <button class="remove-selected-btn" onclick="submissionDetails.removeSelectedReviewer('${reviewer.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    removeSelectedReviewer(reviewerId) {
        this.selectedReviewers = this.selectedReviewers.filter(r => r.id !== reviewerId);
        this.renderSelectedReviewers();
        this.updateAssignButton();
        
        // Update the selected value display in the select
        const selectElement = document.querySelector('.custom-search-select');
        if (selectElement) {
            const selectedValueSpan = selectElement.querySelector('.selected-value');
            const placeholderSpan = selectElement.querySelector('.placeholder');
            
            if (this.selectedReviewers.length === 0) {
                selectedValueSpan.textContent = '';
                selectedValueSpan.style.display = 'none';
                placeholderSpan.style.display = 'inline';
            } else if (this.selectedReviewers.length === 1) {
                selectedValueSpan.textContent = this.selectedReviewers[0].name;
                selectedValueSpan.style.display = 'inline';
                placeholderSpan.style.display = 'none';
            } else {
                selectedValueSpan.textContent = `${this.selectedReviewers.length} selected`;
                selectedValueSpan.style.display = 'inline';
                placeholderSpan.style.display = 'none';
            }
        }
    }

    updateAssignButton() {
        const assignBtn = document.getElementById('assignReviewersBtn');
        if (assignBtn) {
            assignBtn.disabled = this.selectedReviewers.length === 0;
        }
    }

    async assignReviewers() {
        if (this.selectedReviewers.length === 0) return;
        
        try {
            const token = getAuthToken2();
            if (!token) {
                toastr.error('Authentication required. Please login again.', 'Error');
                return;
            }
            
            const reviewerIds = this.selectedReviewers.map(r => r.id);
            
            const requestBody = {
                submissionId: this.submissionId,
                reviewerIds: reviewerIds
            };
            
            const assignBtn = document.getElementById('assignReviewersBtn');
            const originalText = assignBtn.innerHTML;
            assignBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Assigning...';
            assignBtn.disabled = true;
            
            const response = await fetch(`${BASE_URL}/editor/assign-reviewers`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `Failed to assign reviewers: ${response.status}`;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {}
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to assign reviewers');
            }
            
            toastr.success(`Successfully assigned ${this.selectedReviewers.length} reviewer(s)`, 'Success');
            
            setTimeout(async () => {
                await this.loadSubmissionData();
                this.clearSelection();
            }, 1000);
            
        } catch (error) {
            console.error('Error assigning reviewers:', error);
            toastr.error(error.message || 'Failed to assign reviewers', 'Error');
        } finally {
            const assignBtn = document.getElementById('assignReviewersBtn');
            if (assignBtn) {
                assignBtn.innerHTML = '<i class="fas fa-user-check"></i> Assign Selected Reviewers';
                assignBtn.disabled = this.selectedReviewers.length === 0;
            }
        }
    }

    clearSelection() {
        this.selectedReviewers = [];
        this.renderSelectedReviewers();
        this.updateAssignButton();
        
        const selectElement = document.querySelector('.custom-search-select');
        if (selectElement) {
            const selectedValueSpan = selectElement.querySelector('.selected-value');
            const placeholderSpan = selectElement.querySelector('.placeholder');
            const searchInput = selectElement.querySelector('.search-input');
            const optionsList = selectElement.querySelector('.select-options-list');
            
            selectedValueSpan.textContent = '';
            selectedValueSpan.style.display = 'none';
            placeholderSpan.style.display = 'inline';
            
            if (searchInput) {
                searchInput.value = '';
            }
            
            if (optionsList) {
                optionsList.innerHTML = this.renderReviewerOptions(this.allReviewers);
            }
        }
    }

    viewTimeline() {
        window.location.href = `timeline.html?id=${this.submissionId}`;
    }

    getStatusStyle(status) {
        const colors = {
            'submitted': 'background-color: #3b82f6; color: white;',
            'under_review': 'background-color: #f59e0b; color: white;',
            'reviewed': 'background-color: #8b5cf6; color: white;',
            'accepted': 'background-color: #10b981; color: white;',
            'rejected': 'background-color: #ef4444; color: white;'
        };
        return colors[status] || 'background-color: #6b7280; color: white;';
    }

    formatStatus(status) {
        const statusMap = {
            'submitted': 'Submitted',
            'under_review': 'Under Review',
            'reviewed': 'Reviewed',
            'accepted': 'Accepted',
            'rejected': 'Rejected'
        };
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    }

    showLoading() {
        document.getElementById('loadingScreen').style.display = 'block';
        document.getElementById('errorScreen').style.display = 'none';
        document.getElementById('contentContainer').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loadingScreen').style.display = 'none';
    }

    showContent() {
        document.getElementById('contentContainer').style.display = 'block';
    }

    showError(message) {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('errorScreen').style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
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

// Initialize submission details manager
let submissionDetails = new SubmissionDetailsManager();