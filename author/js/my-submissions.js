// my-submissions.js
const BASE_URL = 'https://fp.247laboratory.net/';
const token = localStorage.getItem('token') || null;

class SubmissionsManager {
    constructor() {
        this.currentPage = 1;
        this.limit = 6; // Cards per page
        this.totalItems = 0;
        this.totalPages = 0;
        this.initializeToastr();
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

    // Main function to load manuscripts from API
    async loadManuscripts() {
        this.showLoading();
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            console.log(`Fetching submissions page ${this.currentPage} with limit ${this.limit}`);
            
            const response = await fetch(
                `${BASE_URL}/api/v1/submissions/my-submissions?page=${this.currentPage}&limit=${this.limit}`,
                {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }
            );

            console.log('API Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Data received:', data);
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch submissions');
            }

            this.totalItems = data.total;
            this.totalPages = data.totalPages;
            
            this.renderSubmissions(data.submissions);
            this.renderPagination(data);
            this.hideLoading();

            toastr.success(`Loaded ${data.submissions.length} submissions`, 'Success');

        } catch (error) {
            console.error('Error loading manuscripts:', error);
            this.showError('Failed to load submissions. Please try again.');
            this.hideLoading();
        }
    }

    // Function to render submissions in the grid
    renderSubmissions(submissions) {
        const cardsGrid = document.getElementById('cardsGrid');
        
        if (!submissions || submissions.length === 0) {
            cardsGrid.innerHTML = `
                <div class="alert alert-info" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                    <i class="fas fa-inbox fa-2x" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3>No submissions found</h3>
                    <p>You haven't submitted any manuscripts yet.</p>
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();
        submissions.forEach(submission => {
            fragment.appendChild(this.createCardMarkup(submission));
        });
        
        cardsGrid.innerHTML = '';
        cardsGrid.appendChild(fragment);
    }

    // Function to create individual card markup
    createCardMarkup(submission) {
        const card = document.createElement('article');
        card.className = 'manuscript-card';
        
        card.innerHTML = `
            <button class="btn-edit" aria-label="Edit manuscript" onclick="submissionsManager.onEdit('${submission._id}')">
                <i class="fa fa-pencil"></i>
                <span class="d-none d-sm-inline">Edit</span>
            </button>

            <div class="card-header-row">
                <div style="flex:1; min-width:0">
                    <h3 class="card-title">${this.escapeHtml(submission.title)}</h3>
                    <div class="card-sub">Journal: ${this.escapeHtml(submission.journalId?.title || 'N/A')}</div>
                </div>
            </div>

            <div class="meta-row">
                <div class="meta"><strong>ISSN:</strong> ${this.escapeHtml(submission.journalId?.issn || 'N/A')}</div>
                <div class="meta my-2"><strong>Authors:</strong> ${this.formatAuthors(submission.authors)}</div>
                <div class="ms-auto"><span class="status-badge">${this.escapeHtml(submission.status)}</span></div>
            </div>

            <div class="card-bottom">
                <div class="card-actions mt-3">
                    <button class="btn-download" onclick="submissionsManager.downloadFile('${submission._id}', '${this.escapeHtml(submission.file?.filename)}', '${this.escapeHtml(submission.file?.originalName)}')">
                        <i class="fa fa-download"></i> <span>Download</span>
                    </button>

                    <button class="btn-timeline" onclick="submissionsManager.viewTimeline('${submission._id}')">
                        <i class="fa fa-eye"></i> <span>View Timeline</span>
                    </button>
                </div>

                <div class="submitted-text">Submitted on ${this.formatDate(submission.createdAt)}</div>
            </div>
        `;
        
        return card;
    }

    // Function to render pagination
    renderPagination(data) {
        const paginationContainer = document.getElementById('pagination') || this.createPaginationContainer();
        
        if (data.totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }

        let paginationHTML = `
            <div class="pagination-info">
                Showing ${((this.currentPage - 1) * this.limit) + 1} to ${Math.min(this.currentPage * this.limit, data.total)} of ${data.total} submissions
            </div>
            <div class="pagination-controls">
        `;

        // Previous button
        paginationHTML += `
            <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} 
                onclick="submissionsManager.changePage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= data.totalPages; i++) {
            if (i === 1 || i === data.totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `
                    <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="submissionsManager.changePage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
        }

        // Next button
        paginationHTML += `
            <button class="pagination-btn" ${this.currentPage === data.totalPages ? 'disabled' : ''} 
                onclick="submissionsManager.changePage(${this.currentPage + 1})">
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;

        paginationHTML += '</div>';
        paginationContainer.innerHTML = paginationHTML;
        paginationContainer.style.display = 'flex';
    }

    // Function to create pagination container
    createPaginationContainer() {
        const container = document.createElement('div');
        container.id = 'pagination';
        container.className = 'pagination';
        container.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 2rem;
            padding: 1rem;
            flex-wrap: wrap;
            gap: 1rem;
        `;
        
        document.querySelector('.manuscripts-wrapper').appendChild(container);
        return container;
    }

    // Function to change page
    changePage(page) {
        this.currentPage = page;
        this.loadManuscripts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Function to view timeline
    viewTimeline(submissionId) {
        console.log('Navigating to timeline for submission:', submissionId);
        window.location.href = `/author/timeline.html?id=${submissionId}`;
    }

    // Function to download file
    async downloadFile(submissionId, filename, originalName) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            console.log('Downloading file:', filename, 'for submission:', submissionId);
            
            // Show loading state
            toastr.info('Preparing download...', 'Download');

            const response = await fetch(
                `${BASE_URL}/api/v1/submissions/${submissionId}/download`,
                {
                    headers: { 
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Download failed with status: ${response.status}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            
            // Use original name if available, otherwise use filename
            const downloadName = originalName || filename || `submission-${submissionId}.pdf`;
            a.download = downloadName;
            
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toastr.success('Download started successfully', 'Success');

        } catch (error) {
            console.error('Download error:', error);
            toastr.error('Failed to download file. Please try again.', 'Download Error');
        }
    }

    // Function to edit submission
    onEdit(submissionId) {
        console.log('Editing submission:', submissionId);
        window.location.href = `/author/edit-submission.html?id=${submissionId}`;
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
            month: 'long',
            day: 'numeric'
        });
    }

    // Function to show loading state
    showLoading() {
        const cardsGrid = document.getElementById('cardsGrid');
        cardsGrid.innerHTML = `
            <div class="loading-screen" style="grid-column: 1 / -1; display: flex; justify-content: center; align-items: center; height: 200px; flex-direction: column; gap: 1rem;">
                <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p>Loading your submissions...</p>
            </div>
        `;
    }

    // Function to hide loading state
    hideLoading() {
        // Loading state is handled by clearing the grid
    }

    // Function to show error state
    showError(message) {
        const cardsGrid = document.getElementById('cardsGrid');
        cardsGrid.innerHTML = `
            <div class="error-screen" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--muted);">
                <i class="fas fa-exclamation-triangle fa-2x" style="margin-bottom: 1rem; color: var(--danger);"></i>
                <h3>Failed to load submissions</h3>
                <p>${message}</p>
                <button class="retry-btn" onclick="submissionsManager.loadManuscripts()" style="background: var(--primary); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; margin-top: 1rem;">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
        
        toastr.error(message, 'Error');
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

// Initialize and load submissions when DOM is ready
let submissionsManager;

document.addEventListener('DOMContentLoaded', function() {
    submissionsManager = new SubmissionsManager();
    submissionsManager.loadManuscripts();
});