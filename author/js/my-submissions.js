// js/my-submissions.js
// Uses the server endpoints you confirmed:
//  - GET /submissions/my-submissions?page=1&limit=...
//  - GET /journal?page=1&limit=...
//
// Make sure this file is loaded as a normal script (not module).

const BASE_API = 'https://fp.247laboratory.net/api/v1';

class MySubmissionsManager {
    constructor() {
        this.currentPage = 1;
        this.limit = 6;
        this.totalItems = 0;
        this.totalPages = 0;

        this.journals = [];
        this.filteredSubmissions = [];
        this.currentFilters = {
            journalId: 'all',
            status: 'all',
            isPaid: 'all',
            search: '',
            dateFrom: '',
            dateTo: '',
            sortOrder: 'desc'
        };

        this.statusOptions = [
            'submitted',
            'under_review',
            'reviewed',
            'revision_requested',
            'revised',
            'accepted',
            'rejected',
            'awaiting_payment',
            'published'
        ];

        this.init();
    }

    init() {
        this.initToastr();
        this.injectFilterControls();
        this.loadJournals(); // populate journal filter
        this.fetchAndRender(1); // initial page
        this.bindGlobalEvents();
    }

    initToastr() {
        toastr.options = {
            closeButton: false,
            progressBar: false,
            positionClass: "toast-top-right",
            timeOut: 3000,
            extendedTimeOut: 1000
        };
    }

    bindGlobalEvents() {
        // Allow enter in search to trigger apply
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const active = document.activeElement;
                if (active && active.classList && active.classList.contains('filter-search-input')) {
                    e.preventDefault();
                    this.applyFilters();
                }
            }
        });
    }

    injectFilterControls() {
        const area = document.getElementById('filterArea');
        if (!area) return;

        area.innerHTML = `
            <div class="filter-controls">
                <div class="filter-group">
                    <label class="filter-label">Search</label>
                    <input type="text" id="filterSearch" class="filter-search-input" placeholder="Search title, abstract..." style="padding:0.6rem;border:1px solid var(--border);border-radius:8px;">
                </div>

                <div class="filter-group">
                    <label class="filter-label">Filter by Journal</label>
                    <div class="custom-select with-search" id="journalFilter">
                        <input type="hidden" id="selectedJournalId" value="all">
                        <div class="select-header">
                            <span class="selected-text placeholder">All Journals</span>
                            <i class="fas fa-chevron-down select-arrow"></i>
                        </div>
                        <div class="select-dropdown">
                            <div class="select-search">
                                <i class="fas fa-search"></i>
                                <input type="text" class="select-search-input" placeholder="Search journals...">
                                <button type="button" class="clear-search-btn" style="display:none;"><i class="fas fa-times"></i></button>
                            </div>
                            <div class="select-options" id="journalOptions"></div>
                        </div>
                    </div>
                </div>

                <div class="filter-group">
                    <label class="filter-label">Filter by Status</label>
                    <div class="custom-select" id="statusFilter">
                        <input type="hidden" id="selectedStatus" value="all">
                        <div class="select-header">
                            <span class="selected-text placeholder">All Statuses</span>
                            <i class="fas fa-chevron-down select-arrow"></i>
                        </div>
                        <div class="select-dropdown">
                            <div class="select-options" id="statusOptionsContainer"></div>
                        </div>
                    </div>
                </div>

                <div class="filter-group">
                    <label class="filter-label">Paid</label>
                    <div class="custom-select" id="paidFilter">
                        <input type="hidden" id="selectedPaid" value="all">
                        <div class="select-header">
                            <span class="selected-text placeholder">All</span>
                            <i class="fas fa-chevron-down select-arrow"></i>
                        </div>
                        <div class="select-dropdown">
                            <div class="select-options">
                                <div class="select-option" data-id="all">All</div>
                                <div class="select-option" data-id="paid">Paid</div>
                                <div class="select-option" data-id="unpaid">Unpaid</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="margin-left:auto; display:flex; gap:0.5rem; align-items:center;">
                    <button id="applyFilters" class="btn-primary"><i class="fas fa-filter"></i> Apply</button>
                    <button id="clearFilters" class="btn-secondary">Clear</button>
                </div>
            </div>
        `;

        document.getElementById('applyFilters').addEventListener('click', () => this.applyFilters());
        document.getElementById('clearFilters').addEventListener('click', () => this.clearFilters());
        document.getElementById('filterSearch').addEventListener('input', (e) => {
            this.currentFilters.search = e.target.value.trim();
        });

        // fill status options
        const statusContainer = document.getElementById('statusOptionsContainer');
        if (statusContainer) {
            const opts = [{ id: 'all', title: 'All Statuses' }, ...this.statusOptions.map(s => ({ id: s, title: this.userFriendlyStatus(s) }))];
            statusContainer.innerHTML = opts.map(o => `<div class="select-option" data-id="${o.id}">${this.escapeHtml(o.title)}</div>`).join('');
            // click handler for status
            statusContainer.addEventListener('click', (e) => {
                const opt = e.target.closest('.select-option');
                if (!opt) return;
                const id = opt.getAttribute('data-id');
                const header = document.querySelector('#statusFilter .selected-text');
                if (header) { header.textContent = opt.textContent.trim(); header.classList.remove('placeholder'); }
                const hidden = document.getElementById('selectedStatus');
                if (hidden) { hidden.value = id; hidden.dispatchEvent(new Event('change', { bubbles: true })); }
                this.currentFilters.status = id;
                // close dropdown
                document.getElementById('statusFilter').classList.remove('open');
            });
        }

        // paid select click behavior
        const paidContainer = document.getElementById('paidFilter');
        if (paidContainer) {
            paidContainer.querySelector('.select-options').addEventListener('click', (e) => {
                const opt = e.target.closest('.select-option');
                if (!opt) return;
                const id = opt.getAttribute('data-id');
                const header = paidContainer.querySelector('.selected-text');
                header.textContent = opt.textContent.trim();
                header.classList.remove('placeholder');
                const hidden = document.getElementById('selectedPaid');
                hidden.value = id;
                this.currentFilters.isPaid = id;
                paidContainer.classList.remove('open');
            });
        }

        // attach toggle logic for custom selects so they behave like your editor page
        this.attachSimpleSelectToggles();
    }

    attachSimpleSelectToggles() {
        document.querySelectorAll('.custom-select').forEach(container => {
            const header = container.querySelector('.select-header');
            const dropdown = container.querySelector('.select-dropdown');
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                // close other selects
                document.querySelectorAll('.custom-select.open').forEach(c => {
                    if (c !== container) c.classList.remove('open');
                });
                container.classList.toggle('open');
                // focus search if present
                const input = container.querySelector('.select-search-input');
                if (input && container.classList.contains('open')) setTimeout(()=>input.focus(), 50);
            });
            // click outside closes selects
            document.addEventListener('click', (e) => {
                if (!container.contains(e.target)) container.classList.remove('open');
            });

            // search within the journal dropdown
            const searchInput = container.querySelector('.select-search-input');
            const clearBtn = container.querySelector('.clear-search-btn');
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    const q = searchInput.value.trim().toLowerCase();
                    if (clearBtn) clearBtn.style.display = q ? 'flex' : 'none';
                    const options = container.querySelectorAll('.select-option');
                    options.forEach(opt => {
                        const txt = opt.textContent.toLowerCase();
                        opt.style.display = txt.includes(q) ? '' : 'none';
                    });
                });
                if (clearBtn) clearBtn.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    searchInput.value = '';
                    clearBtn.style.display = 'none';
                    searchInput.focus();
                    // show all options
                    container.querySelectorAll('.select-option').forEach(opt => opt.style.display = '');
                });
            }
        });
    }

    async loadJournals() {
        // call the endpoint you confirmed: /journal?page=1&limit=10
        try {
            const token = localStorage.getItem('token');
            const url = `${BASE_API}/journal/shallow`;
            const resp = await fetch(url, {
                headers: { 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
            });

            if (!resp.ok) {
                console.warn('Journals endpoint returned', resp.status);
                // show empty list gracefully
                this.journals = [{ id:'all', title:'All Journals', issn: '' }];
                this.populateJournalOptions();
                return;
            }

            const data = await resp.json();
            // some servers return { success:true, journals: [...] } or { success:true, data: [...] } or { success:true, results: [...] }
            let list = [];
            if (Array.isArray(data.journals)) list = data.journals;
            else if (Array.isArray(data.data)) list = data.data;
            else if (Array.isArray(data.results)) list = data.results;
            else if (Array.isArray(data)) list = data;
            else list = [];

            // map into simplified structure for the select
            this.journals = [{ id: 'all', title: 'All Journals', issn: '' }, ...list.map(j => ({
                id: j._id || j.id || j._id,
                title: j.title || j.name || 'Untitled Journal',
                issn: j.issn || ''
            }))];

            this.populateJournalOptions();

        } catch (err) {
            console.error('Could not load journals', err);
            this.journals = [{ id:'all', title:'All Journals', issn: '' }];
            this.populateJournalOptions();
        }
    }

    populateJournalOptions() {
        const container = document.getElementById('journalOptions');
        if (!container) return;
        container.innerHTML = this.journals.map(j => `
            <div class="select-option" data-id="${this.escapeHtml(String(j.id))}">
                <div class="option-title" style="font-weight:600;">${this.escapeHtml(j.title)}</div>
                ${j.issn ? `<div style="font-size:0.85rem; color:var(--muted)"><i class="fas fa-hashtag"></i> ${this.escapeHtml(j.issn)}</div>` : ''}
            </div>
        `).join('');

        // click handler for selecting journal
        container.addEventListener('click', (e) => {
            const opt = e.target.closest('.select-option');
            if (!opt) return;
            const id = opt.getAttribute('data-id');
            const titleEl = opt.querySelector('.option-title');
            const title = titleEl ? titleEl.textContent.trim() : opt.textContent.trim();
            const header = document.querySelector('#journalFilter .selected-text');
            if (header) { header.textContent = title; header.classList.remove('placeholder'); }
            const hidden = document.getElementById('selectedJournalId');
            hidden.value = id;
            this.currentFilters.journalId = id;
            document.getElementById('journalFilter').classList.remove('open');
        });
    }

    // Fetch submissions from backend (uses your confirmed endpoint)
    async fetchAndRender(page = 1) {
        const grid = document.getElementById('cardsGrid');
        if (grid) {
            grid.innerHTML = `<div class="no-results" style="grid-column:1/-1; text-align:center;">
                <div style="display:flex; flex-direction:column; gap:0.6rem; align-items:center; padding:2rem;">
                  <div class="spinner" style="width:36px; height:36px; border:4px solid #f3f3f3; border-top:4px solid var(--primary); border-radius:50%; animation:spin 1s linear infinite;"></div>
                  <div style="color:var(--muted)">Loading submissions...</div>
                </div>
            </div>`;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toastr.error('Authentication required. Please login.');
                this.showNoSubmissions('Please login to see your submissions.');
                return;
            }

            // Build query params based on filters - backend filtering (your request)
            const params = new URLSearchParams();
            params.set('page', page);
            params.set('limit', this.limit);
            params.set('sortBy', 'createdAt');
            params.set('sortOrder', this.currentFilters.sortOrder || 'desc');

            if (this.currentFilters.status && this.currentFilters.status !== 'all') params.set('status', this.currentFilters.status);
            if (this.currentFilters.journalId && this.currentFilters.journalId !== 'all') params.set('journalId', this.currentFilters.journalId);
            if (this.currentFilters.search) params.set('search', this.currentFilters.search);
            if (this.currentFilters.isPaid && this.currentFilters.isPaid !== 'all') params.set('isPaid', this.currentFilters.isPaid === 'paid' ? 'true' : 'false');
            if (this.currentFilters.dateFrom) params.set('dateFrom', this.currentFilters.dateFrom);
            if (this.currentFilters.dateTo) params.set('dateTo', this.currentFilters.dateTo);

            const url = `${BASE_API}/submissions/my-submissions?${params.toString()}`;

            const resp = await fetch(url, {
                headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
            });

            if (!resp.ok) {
                const text = await resp.text().catch(()=>'');
                console.error('Submissions fetch failed', resp.status, text);
                this.showNoSubmissions('Failed to load submissions. Server returned an error.');
                return;
            }

            const data = await resp.json();
            // expected shape: { success:true, submissions:[...], total, page, totalPages }
            if (!data || (!Array.isArray(data.submissions) && !Array.isArray(data.data))) {
                console.warn('Unexpected submissions response', data);
                this.showNoSubmissions('No submissions available.');
                return;
            }

            const submissions = data.submissions || data.data || [];
            this.totalItems = data.total ?? submissions.length;
            this.totalPages = data.totalPages ?? Math.max(1, Math.ceil(this.totalItems / this.limit));
            this.currentPage = data.page ?? page;

            this.renderGridFromServer(submissions);
        } catch (err) {
            console.error('Error fetching submissions', err);
            this.showNoSubmissions('Failed to load submissions. Please try again later.');
        }
    }

    renderGridFromServer(submissions) {
        const grid = document.getElementById('cardsGrid');
        if (!grid) return;

        if (!submissions || submissions.length === 0) {
            grid.innerHTML = `<div class="no-results"><i class="fas fa-inbox" style="font-size:2rem; opacity:0.5;"></i>
                <h3 style="margin-top:0.5rem;">No submissions found</h3>
                <p style="color:var(--muted)">${this.totalItems === 0 ? "You haven't submitted any manuscripts yet." : "No submissions match your filters."}</p>
            </div>`;
            this.renderPagination();
            return;
        }

        const frag = document.createDocumentFragment();
        submissions.forEach(s => frag.appendChild(this.createCardElement(s)));
        grid.innerHTML = '';
        grid.appendChild(frag);

        this.renderPagination();
    }

    renderPagination() {
        let paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.id = 'pagination';
            paginationContainer.className = 'pagination';
            document.querySelector('.manuscripts-wrapper').appendChild(paginationContainer);
        }

        if (this.totalItems === 0) {
            paginationContainer.style.display = 'none';
            return;
        }
        paginationContainer.style.display = 'flex';

        let html = `<div class="pagination-info">
            Showing ${((this.currentPage - 1) * this.limit) + 1} to ${Math.min(this.currentPage * this.limit, this.totalItems)} of ${this.totalItems} submission${this.totalItems !== 1 ? 's' : ''}
        </div>
        <div class="pagination-controls">`;

        html += `<button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} onclick="submissionsManager.changePage(${this.currentPage - 1})"><i class="fas fa-chevron-left"></i> Previous</button>`;

        const maxVisible = 5;
        let start = Math.max(1, this.currentPage - Math.floor(maxVisible/2));
        let end = Math.min(this.totalPages, start + maxVisible - 1);
        if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

        if (start > 1) {
            html += `<button class="pagination-btn" onclick="submissionsManager.changePage(1)">1</button>`;
            if (start > 2) html += `<span class="pagination-dots">...</span>`;
        }
        for (let i = start; i <= end; i++) {
            html += `<button class="pagination-btn ${i===this.currentPage ? 'active' : ''}" onclick="submissionsManager.changePage(${i})">${i}</button>`;
        }
        if (end < this.totalPages) {
            if (end < this.totalPages - 1) html += `<span class="pagination-dots">...</span>`;
            html += `<button class="pagination-btn" onclick="submissionsManager.changePage(${this.totalPages})">${this.totalPages}</button>`;
        }

        html += `<button class="pagination-btn" ${this.currentPage === this.totalPages ? 'disabled' : ''} onclick="submissionsManager.changePage(${this.currentPage + 1})">Next <i class="fas fa-chevron-right"></i></button>`;
        html += '</div>';

        paginationContainer.innerHTML = html;
    }

    changePage(page) {
        if (!page || page < 1) page = 1;
        if (page > this.totalPages) page = this.totalPages;
        this.currentPage = page;
        this.fetchAndRender(page);
        document.getElementById('cardsGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    createCardElement(sub) {
    const article = document.createElement('article');
    article.className = 'submission-card';

    const statusText = this.userFriendlyStatus(sub.status);
    const statusStyle = this.getStatusStyle(sub.status);

    const title = sub.title || 'Untitled';
    const journalTitle = (sub.journalId && (sub.journalId.title || sub.journalId)) || 'Unknown Journal';
    const authors = Array.isArray(sub.authors) ? sub.authors : [];
    // show "Resubmit" when status is either 'revised' OR 'revision_requested'
    const isResubmit = ['revised', 'revision_requested'].includes(String(sub.status));

    article.innerHTML = `
        <div class="status-badge" style="${statusStyle}">${this.escapeHtml(statusText)}</div>

        <div class="card-header">
            <div class="card-title" title="${this.escapeHtml(title)}">${this.escapeHtml(this.truncate(title, 80))}</div>
            <div class="card-sub" title="${this.escapeHtml(journalTitle)}">
                <i class="fas fa-book"></i>
                <span>${this.escapeHtml(this.truncate(journalTitle, 50))}</span>
            </div>
        </div>

        <div class="card-content">
            <div>
                <div style="font-weight:600; font-size:0.95rem; margin-bottom:0.25rem;">Authors</div>
                <div class="authors">
                    ${authors.length ? authors.map(a => `<span class="author">${this.escapeHtml(a.name)}</span>`).join('') : '<div style="color:var(--muted)">No authors listed</div>'}
                </div>
            </div>

            <div class="action-links">
                <button class="link" data-action="timeline" data-id="${sub._id}" title="View timeline">
                    <i class="fas fa-history"></i> Timeline
                </button>

                <button class="link" data-action="download" data-id="${sub._id}" title="Download file">
                    <i class="fas fa-download"></i> Download
                </button>

                ${isResubmit
                    ? `<button class="link" data-action="resubmit" data-id="${sub._id}" title="Resubmit"><i class="fas fa-redo"></i> Resubmit</button>`
                    : `<button class="link" data-action="edit" data-id="${sub._id}" title="Edit"><i class="fas fa-pen"></i> Edit</button>`
                }
            </div>
        </div>

        <div class="card-footer">
            <a class="btn-view" href="submission-details.html?id=${sub._id}" title="View details">
                <i class="fas fa-eye"></i> View Details
            </a>

            <div class="submitted-date">
                <i class="fas fa-calendar-alt"></i>
                <span>Submitted: ${this.formatDate(sub.createdAt)}</span>
            </div>
        </div>
    `;

    // attach handlers
    article.querySelectorAll('[data-action]').forEach(btn => {
        const act = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        if (act === 'download') btn.addEventListener('click', e => { e.preventDefault(); this.downloadFile(id); });
        if (act === 'timeline') btn.addEventListener('click', e => { e.preventDefault(); this.goToTimeline(id); });
        if (act === 'edit') btn.addEventListener('click', e => { e.preventDefault(); this.edit(id); });
        if (act === 'resubmit') btn.addEventListener('click', e => { e.preventDefault(); this.resubmit(id); });
    });

    return article;
}


    async downloadFile(subId) {
        try {
            const token = localStorage.getItem('token');
            if (!token) { toastr.error('Authentication required.'); return; }

            toastr.info('Preparing download...');
            const resp = await fetch(`${BASE_API}/submissions/${subId}/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!resp.ok) { toastr.error('Failed to download file.'); return; }

            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `submission-${subId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toastr.success('Download started');
        } catch (err) {
            console.error('Download error', err);
            toastr.error('Failed to download file.');
        }
    }

    goToTimeline(subId) { window.location.href = `/author/timeline.html?id=${subId}`; }
    edit(subId) { window.location.href = `/author/edit-submission.html?id=${subId}`; }
    resubmit(subId) { window.location.href = `/author/resubmission.html?id=${subId}`; }

    applyFilters() {
        // Reset to first page and call backend with filters
        this.currentPage = 1;

        // read UI fields (in case user manipulated them directly)
        const searchEl = document.getElementById('filterSearch');
        if (searchEl) this.currentFilters.search = searchEl.value.trim();

        const journalHidden = document.getElementById('selectedJournalId');
        if (journalHidden) this.currentFilters.journalId = journalHidden.value || 'all';

        const statusHidden = document.getElementById('selectedStatus');
        if (statusHidden) this.currentFilters.status = statusHidden.value || 'all';

        const paidHidden = document.getElementById('selectedPaid');
        if (paidHidden) this.currentFilters.isPaid = paidHidden.value || 'all';

        this.fetchAndRender(1);
    }

    clearFilters() {
        this.currentFilters = { journalId: 'all', status: 'all', isPaid: 'all', search: '', dateFrom: '', dateTo: '', sortOrder: 'desc' };

        const searchEl = document.getElementById('filterSearch'); if (searchEl) { searchEl.value = ''; }
        const journalHeader = document.querySelector('#journalFilter .selected-text'); if (journalHeader) { journalHeader.textContent = 'All Journals'; journalHeader.classList.add('placeholder'); }
        const statusHeader = document.querySelector('#statusFilter .selected-text'); if (statusHeader) { statusHeader.textContent = 'All Statuses'; statusHeader.classList.add('placeholder'); }
        const paidHeader = document.querySelector('#paidFilter .selected-text'); if (paidHeader) { paidHeader.textContent = 'All'; paidHeader.classList.add('placeholder'); }

        document.getElementById('selectedJournalId').value = 'all';
        document.getElementById('selectedStatus').value = 'all';
        document.getElementById('selectedPaid').value = 'all';

        this.fetchAndRender(1);
    }

    userFriendlyStatus(status) {
        const map = {
            'submitted': 'Submitted',
            'under_review': 'Under Review',
            'reviewed': 'Reviewed',
            'revision_requested': 'Revision Requested',
            'revised': 'Revised',
            'accepted': 'Accepted',
            'rejected': 'Rejected',
            'awaiting_payment': 'Awaiting Payment',
            'published': 'Published'
        };
        return map[status] || (status ? status.replace(/_/g,' ') : '');
    }

    getStatusStyle(status) {
        const styles = {
            'submitted': { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
            'under_review': { bg: '#fff7ed', color: '#d97706', border: '#fde68a' },
            'reviewed': { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
            'accepted': { bg: '#ecfdf5', color: '#059669', border: '#bbf7d0' },
            'rejected': { bg: '#fff1f2', color: '#dc2626', border: '#fecaca' },
            'revision_requested': { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
            'revised': { bg: '#f0f9ff', color: '#0369a1', border: '#bfeafe' },
            'awaiting_payment': { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
            'published': { bg: '#ecfdf5', color: '#059669', border: '#bbf7d0' }
        };
        const s = styles[status] || { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' };
        return `background:${s.bg}; color:${s.color}; border:1px solid ${s.border};`;
    }

    truncate(str, n) { if (!str) return ''; return str.length <= n ? str : str.slice(0, n-3) + '...'; }
    formatDate(iso) { if (!iso) return 'N/A'; try { const d = new Date(iso); return d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }); } catch { return iso; } }
    escapeHtml(s) { if (!s && s !== 0) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;"); }

    showNoSubmissions(msg) {
        const grid = document.getElementById('cardsGrid');
        if (!grid) return;
        grid.innerHTML = `<div class="no-results"><i class="fas fa-inbox" style="font-size:2rem; opacity:0.5;"></i>
            <h3 style="margin-top:0.5rem;">No submissions found</h3>
            <p style="color:var(--muted)">${this.escapeHtml(msg || "You haven't submitted any manuscripts yet.")}</p>
        </div>`;
    }
}

// Initialize manager globally
let submissionsManager;
document.addEventListener('DOMContentLoaded', () => {
    submissionsManager = new MySubmissionsManager();
    window.submissionsManager = submissionsManager;
});
