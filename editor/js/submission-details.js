// submission-details.js
import { BASE_URL, getAuthToken2, createEditorSelect } from '../../assets/js/utility.js';

class SubmissionDetailsManager {
    constructor() {
        this.submissionId = this.getSubmissionIdFromURL();
        this.submission = null;
        this.selectedReviewers = [];
        this.reviewerSelect = null;
        
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
            closeButton: true,
            progressBar: true,
            positionClass: "toast-top-right",
            timeOut: 5000,
            extendedTimeOut: 2000
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
            // Load submission data
            await this.loadSubmissionData();
            
            // Initialize reviewer select component
            await this.initializeReviewerSelect();
            
            // Hide loading, show content
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
            
            this.submission = data.submission || data.data;
            
            // Render the data
            this.renderManuscriptHeader();
            this.renderAuthors();
            this.renderCurrentReviewers();
            this.renderRecentTimeline();
            
        } catch (error) {
            console.error('Error loading submission data:', error);
            throw error;
        }
    }

    async initializeReviewerSelect() {
        const container = document.getElementById('reviewerSearchContainer');
        if (!container) return;
        
        // For now, use sample reviewers data
        // In the future, this will come from an API
        const sampleReviewers = this.getSampleReviewers();
        
        try {
            this.reviewerSelect = await createEditorSelect({
                container: container,
                placeholder: 'Search for reviewers...',
                multiple: true,
                maxDisplay: 5,
                onSelect: (selected) => {
                    this.updateSelectedReviewers(selected);
                }
            });
            
            // Override the options with sample data
            // This is temporary until we have the actual API
            this.reviewerSelect.setOptions(sampleReviewers);
            
        } catch (error) {
            console.error('Error initializing reviewer select:', error);
            toastr.error('Failed to load reviewers list', 'Error');
        }
    }

    getSampleReviewers() {
        return [
            { id: 'rev1', name: 'Dr. Sarah Wilson', email: 'sarah.wilson@university.edu' },
            { id: 'rev2', name: 'Prof. Michael Brown', email: 'michael.brown@research.edu' },
            { id: 'rev3', name: 'Dr. David Lee', email: 'david.lee@science.edu' },
            { id: 'rev4', name: 'Prof. James Miller', email: 'james.miller@tech.edu' },
            { id: 'rev5', name: 'Dr. Thomas Green', email: 'thomas.green@medical.edu' },
            { id: 'rev6', name: 'Dr. Rachel Adams', email: 'rachel.adams@neuro.edu' },
            { id: 'rev7', name: 'Prof. Kevin Zhang', email: 'kevin.zhang@cs.edu' },
            { id: 'rev8', name: 'Dr. Lisa Wang', email: 'lisa.wang@engineering.edu' }
        ];
    }

    updateSelectedReviewers(selected) {
        this.selectedReviewers = selected;
        this.renderSelectedReviewers();
        this.updateAssignButton();
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
        
        // Update the custom select component
        if (this.reviewerSelect) {
            this.reviewerSelect.removeSelected(reviewerId);
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
            const reviewerIds = this.selectedReviewers.map(r => r.id);
            
            // Show loading state
            const assignBtn = document.getElementById('assignReviewersBtn');
            const originalText = assignBtn.innerHTML;
            assignBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Assigning...';
            assignBtn.disabled = true;
            
            // In the future, this will be an actual API call
            // For now, simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update local state
            this.submission.assignedReviewers = [
                ...(this.submission.assignedReviewers || []),
                ...this.selectedReviewers.map(r => ({
                    _id: r.id,
                    name: r.name,
                    email: r.email
                }))
            ];
            
            // Update UI
            this.renderCurrentReviewers();
            this.clearSelection();
            
            toastr.success(`Assigned ${this.selectedReviewers.length} reviewer(s) successfully`, 'Success');
            
        } catch (error) {
            console.error('Error assigning reviewers:', error);
            toastr.error('Failed to assign reviewers', 'Error');
        } finally {
            // Reset button state
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
        
        // Clear the custom select
        if (this.reviewerSelect) {
            this.reviewerSelect.setSelected([]);
        }
        
        toastr.info('Selection cleared', 'Info');
    }

    renderManuscriptHeader() {
        const header = document.getElementById('manuscriptHeader');
        if (!header || !this.submission) return;
        
        const formattedDate = this.formatDate(this.submission.createdAt);
        const statusDisplay = this.formatStatus(this.submission.status);
        const journalName = this.submission.journalId?.title || this.submission.journalName || 'Unknown Journal';
        const submittedBy = this.submission.createdBy?.name || this.submission.createdBy?.email || 'Unknown';
        
        header.innerHTML = `
            <h1>${this.escapeHtml(this.submission.title)}</h1>
            <span class="header-status-badge">${statusDisplay}</span>
            <div class="header-meta">
                <div class="meta-item">
                    <i class="fas fa-book-open"></i>
                    <span>Journal: ${this.escapeHtml(journalName)}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-user"></i>
                    <span>Submitted by: ${this.escapeHtml(submittedBy)}</span>
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
                <button class="remove-reviewer-btn" onclick="submissionDetails.removeReviewer('${reviewer._id || reviewer.id}')">
                    <i class="fas fa-times"></i>
                </button>
                <div class="reviewer-name">${this.escapeHtml(reviewer.name)}</div>
                <div class="reviewer-email">
                    <i class="fas fa-envelope"></i>
                    ${this.escapeHtml(reviewer.email)}
                </div>
                <div class="reviewer-status">
                    <span class="status-indicator"></span>
                    Awaiting review
                </div>
            </div>
        `).join('');
    }

    removeReviewer(reviewerId) {
        if (!confirm('Are you sure you want to remove this reviewer?')) return;
        
        // In the future, this will be an API call
        // For now, update local state
        this.submission.assignedReviewers = (this.submission.assignedReviewers || [])
            .filter(r => (r._id || r.id) !== reviewerId);
        
        this.renderCurrentReviewers();
        toastr.success('Reviewer removed', 'Success');
    }

    renderRecentTimeline() {
        const timelineContainer = document.getElementById('recentTimeline');
        if (!timelineContainer || !this.submission) return;
        
        // For now, show sample timeline events
        // In the future, this will come from the submission history
        const sampleEvents = [
            {
                status: 'submitted',
                comment: 'Manuscript submitted for review',
                date: this.submission.createdAt
            },
            {
                status: 'under_review',
                comment: 'Manuscript assigned to editor',
                date: new Date(Date.now() - 86400000).toISOString() // 1 day ago
            }
        ];
        
        timelineContainer.innerHTML = sampleEvents.map(event => `
            <div class="timeline-event">
                <div class="event-header">
                    <span class="event-status" style="${this.getStatusStyle(event.status)}">
                        ${this.formatStatus(event.status)}
                    </span>
                    <span class="event-date">${this.formatDate(event.date)}</span>
                </div>
                <p class="event-comment">${this.escapeHtml(event.comment)}</p>
            </div>
        `).join('');
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
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
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