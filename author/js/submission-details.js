// js/submission-details.js
// Must be loaded as: <script type="module" src="js/submission-details.js"></script>

import { BASE_URL, getAuthToken2 } from '/assets/js/utility.js';

const $ = (s) => document.querySelector(s);

class SubmissionDetailsManager {
  constructor() {
    this.submissionId = this.getSubmissionIdFromURL();
    if (!this.submissionId) {
      this.showError('No submission ID provided');
      console.error('No submission id in URL');
      return;
    }

    // Elements
    this.loadingScreen = $('#loadingScreen');
    this.errorScreen = $('#errorScreen');
    this.errorMessage = $('#errorMessage');
    this.contentContainer = $('#contentContainer');
    this.manuscriptHeader = $('#manuscriptHeader');
    this.authorsList = $('#authorsList');
    this.recentTimeline = $('#recentTimeline');
    this.viewFullTimelineBtn = $('#viewTimelineBtn') || $('#viewFullTimelineBtn');

    // Review details & revised section
    this.reviewDetailsSection = $('#reviewDetailsSection'); // ensure exists in HTML or we create fallback later
    this.revisionCountDisplay = $('#revisionCountDisplay');
    this.revisedSection = $('#revisedSection');
    this.resubmitBtn = $('#resubmitBtn');

    // Buttons in header
    this.viewDocumentBtn = $('#viewDocumentBtn');
    this.downloadBtn = $('#downloadBtn');

    this.initializeToastr();
    this.showLoading();
    this.init().catch(err => {
      console.error('Init error', err);
      this.showError('Failed to initialize page.');
    });
  }

  getSubmissionIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  initializeToastr() {
    if (typeof toastr !== 'undefined') {
      toastr.options = {
        closeButton: false,
        progressBar: false,
        positionClass: "toast-top-right",
        timeOut: 3000,
        extendedTimeOut: 1000
      };
    }
  }

  showLoading() {
    if (this.loadingScreen) this.loadingScreen.style.display = 'block';
    if (this.errorScreen) this.errorScreen.style.display = 'none';
    if (this.contentContainer) this.contentContainer.style.display = 'none';
  }

  hideLoading() {
    if (this.loadingScreen) this.loadingScreen.style.display = 'none';
  }

  showContent() {
    if (this.contentContainer) this.contentContainer.style.display = 'block';
  }

  showError(msg) {
    if (this.loadingScreen) this.loadingScreen.style.display = 'none';
    if (this.contentContainer) this.contentContainer.style.display = 'none';
    if (this.errorScreen) {
      this.errorScreen.style.display = 'block';
      if (this.errorMessage) this.errorMessage.textContent = msg || 'An error occurred';
    }
    if (typeof toastr !== 'undefined' && msg) toastr.error(msg);
  }

  escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#39;');
  }

  formatDate(dateString) {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch (e) {
      return dateString;
    }
  }

  statusConfig(status) {
    const s = (status || '').toLowerCase();
    const map = {
      'submitted': { label: 'Submitted', style: 'background-color: rgba(59,130,246,0.12); color: #0366d6; border:1px solid rgba(59,130,246,0.2);' },
      'under_review': { label: 'Under Review', style: 'background-color: rgba(245,158,11,0.12); color:#b45309; border:1px solid rgba(245,158,11,0.2);' },
      'reviewed': { label: 'Reviewed', style: 'background-color: rgba(139,92,246,0.12); color:#6d28d9; border:1px solid rgba(139,92,246,0.2);' },
      'accepted': { label: 'Accepted', style: 'background-color: rgba(16,185,129,0.12); color:#059669; border:1px solid rgba(16,185,129,0.2);' },
      'rejected': { label: 'Rejected', style: 'background-color: rgba(239,68,68,0.12); color:#b91c1c; border:1px solid rgba(239,68,68,0.2);' },
      'revised': { label: 'Revised', style: 'background-color: rgba(139,92,246,0.12); color:#6d28d9; border:1px solid rgba(139,92,246,0.2);' },
      'awaiting_payment': { label: 'Awaiting Payment', style: 'background-color: rgba(245,158,11,0.12); color:#b45309; border:1px solid rgba(245,158,11,0.2);' },
      'published': { label: 'Published', style: 'background-color: rgba(16,185,129,0.12); color:#059669; border:1px solid rgba(16,185,129,0.2);' }
    };
    return map[s] || { label: status || '', style: 'background-color: rgba(107,114,128,0.12); color: var(--muted); border:1px solid rgba(0,0,0,0.06);' };
  }

  buildFileUrl(filePath) {
    if (!filePath) return null;
    // If filePath is absolute URL already, return
    try {
      const maybe = new URL(filePath, window.location.origin);
      // if filePath is relative like "/uploads/..." we want BASE_URL origin used
      // Use BASE_URL origin if BASE_URL is absolute
      try {
        const base = new URL(BASE_URL);
        return new URL(filePath, base.origin).toString();
      } catch (_) {
        return maybe.toString();
      }
    } catch (e) {
      return filePath;
    }
  }

  async fetchJson(url, opts = {}) {
    const token = (typeof getAuthToken2 === 'function') ? getAuthToken2() : (localStorage.getItem('token') || null);
    const headers = { 'Accept': 'application/json', ...(opts.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { ...opts, headers });
    if (!res.ok) {
      const txt = await res.text().catch(()=>null);
      const err = new Error(`HTTP ${res.status} ${res.statusText}`);
      err.status = res.status;
      err.body = txt;
      throw err;
    }
    return res.json();
  }

  async init() {
    try {
      await this.loadSubmission(this.submissionId);
      this.hideLoading();
      this.showContent();
    } catch (err) {
      console.error('load submission error', err);
      this.showError(err.message || 'Failed to load submission');
    }
  }

  async loadSubmission(id) {
    // Primary: /submissions/details/:id
    // Fallback: /submissions/:id (if needed)
    let details = null;
    try {
      details = await this.fetchJson(`${BASE_URL.replace(/\/+$/,'')}/submissions/details/${id}`);
    } catch (err) {
      console.warn('Details endpoint failed, trying full submission endpoint', err);
    }

    // If details exists but doesn't include authors/journal/file/title we fallback
    let full = null;
    if (details && details.success) {
      // details.submission may contain limited fields — copy to "full" then check
      full = { ...(details.submission || {}) };
    }

    const needsFallback = !full || !full.title || !full.journalId || !full.authors || !full.file;

    if (needsFallback) {
      try {
        const f = await this.fetchJson(`${BASE_URL.replace(/\/+$/,'')}/submissions/${id}`);
        if (f && f.success && f.submission) full = { ...full, ...f.submission };
      } catch (err) {
        console.warn('Fallback fetch failed (it\'s ok if server does not provide full submission):', err);
      }
    }

    // If still no data, throw
    if (!full) throw new Error('Submission data not available');

    // Render header
    this.renderManuscriptHeader(full);

    // Render authors
    this.renderAuthors(full.authors || []);

    // Wire view/download buttons to file (if available)
    const fileUrl = full.file && (full.file.url || full.file);
    const resolvedFileUrl = fileUrl ? this.buildFileUrl(fileUrl) : null;
    if (this.viewDocumentBtn) {
      this.viewDocumentBtn.onclick = (e) => {
        e.preventDefault();
        if (!resolvedFileUrl) { if (typeof toastr !== 'undefined') toastr.info('No document available'); return; }
        window.open(resolvedFileUrl, '_blank');
      };
    }
    if (this.downloadBtn) {
      this.downloadBtn.onclick = (e) => {
        e.preventDefault();
        if (!resolvedFileUrl) { if (typeof toastr !== 'undefined') toastr.info('No document available'); return; }
        window.open(resolvedFileUrl, '_blank');
      };
    }

    // Load review details using details endpoint (guaranteed earlier attempt)
    try {
      await this.loadReviewDetails(id, (full.currentStatus || full.status || '').toLowerCase());
    } catch (e) {
      console.warn('review details error', e);
    }

    // Revised handling
    const status = (full.currentStatus || full.status || '').toLowerCase();
    if (status === 'revised') {
      if (this.revisedSection) this.revisedSection.style.display = 'block';
      await this.loadRevisionHistory(id);
      if (this.resubmitBtn) {
        this.resubmitBtn.onclick = () => window.location.href = `resubmission.html?id=${id}`;
      }
    } else {
      if (this.revisedSection) this.revisedSection.style.display = 'none';
    }

    // Timeline: fetch latest event
    await this.loadLatestTimeline(id);

    // Wire view full timeline
    if (this.viewFullTimelineBtn) {
      this.viewFullTimelineBtn.onclick = () => window.location.href = `timeline.html?id=${id}`;
    }
  }

  renderManuscriptHeader(submission) {
    if (!this.manuscriptHeader) return;
    const title = submission.title || 'Untitled';
    const journal = (submission.journalId && (submission.journalId.title || submission.journalId)) || 'Unknown Journal';
    const issn = (submission.journalId && submission.journalId.issn) || 'N/A';
    const createdAt = submission.createdAt || submission.updatedAt || '';
    const submittedOn = this.formatDate(createdAt);
    const submitter = submission.submitterName || submission.createdBy || '';

    // currentStatus preferred
    const status = (submission.currentStatus || submission.status || '').toLowerCase();
    const cfg = this.statusConfig(status);

    this.manuscriptHeader.innerHTML = `
      <h1>${this.escapeHtml(title)}</h1>
      <span class="header-status-badge" style="${cfg.style}; padding:.45rem .85rem; border-radius:20px;">${this.escapeHtml(cfg.label)}</span>

      <div class="header-meta" style="margin-top:1rem;">
        <div class="meta-item"><i class="fas fa-book-open"></i> <span>Journal: ${this.escapeHtml(journal)}</span></div>
        <div class="meta-item"><i class="fas fa-hashtag"></i> <span>ISSN: ${this.escapeHtml(issn)}</span></div>
        <div class="meta-item"><i class="fas fa-user"></i> <span>Submitted by: ${this.escapeHtml(submitter)}</span></div>
        <div class="meta-item"><i class="far fa-calendar"></i> <span>Submitted on: ${this.escapeHtml(submittedOn)}</span></div>
      </div>

      <div style="margin-top:1rem;">
        <button id="viewDocumentBtn" class="btn-primary" style="margin-right:.5rem;"><i class="fas fa-file"></i> View Document</button>
        <button id="downloadBtn" class="btn-secondary"><i class="fas fa-download"></i> Download</button>
      </div>
    `;

    // reassign the button handles to the newly created elements
    this.viewDocumentBtn = $('#viewDocumentBtn');
    this.downloadBtn = $('#downloadBtn');
  }

  renderAuthors(authors = []) {
    if (!this.authorsList) return;
    if (!authors || authors.length === 0) {
      this.authorsList.innerHTML = `<div class="no-authors"><i class="fas fa-user-slash"></i> No authors listed</div>`;
      return;
    }
    this.authorsList.innerHTML = authors.map(a => `
      <div class="author-item">
        <div class="author-name">${this.escapeHtml(a.name)}</div>
        <div class="author-email"><i class="fas fa-envelope"></i> ${this.escapeHtml(a.email)}</div>
      </div>
    `).join('');
  }

  async loadReviewDetails(submissionId, currentStatus) {
    try {
      const data = await this.fetchJson(`${BASE_URL.replace(/\/+$/,'')}/submissions/details/${submissionId}`);
      if (!data || !data.success) {
        if (this.reviewDetailsSection) this.reviewDetailsSection.style.display = 'none';
        return;
      }

      const sub = data.submission || {};
      const revCount = sub.revisionCount || 0;
      if (this.revisionCountDisplay) this.revisionCountDisplay.textContent = revCount;
      // editorialDecision and reviewerFeedback
      const editorialDecision = data.editorialDecision || null;
      const reviewerFeedback = data.reviewerFeedback || { available: false, message: 'No reviewer feedback available yet' };

      // Show review details only if status is not 'submitted' or 'under_review'
      const s = (currentStatus || '').toLowerCase();
      if (s === 'submitted' || s === 'under_review') {
        if (this.reviewDetailsSection) this.reviewDetailsSection.style.display = 'none';
        return;
      }

      // Ensure section present
      if (this.reviewDetailsSection) {
        this.reviewDetailsSection.style.display = 'block';
        // Fill content—expectation: the HTML has elements to host these values (ids used below)
        const rvCountEl = $('#rvCount');
        const editorialDecisionEl = $('#editorialDecision');
        const reviewerFeedbackEl = $('#reviewerFeedback');

        if (rvCountEl) rvCountEl.textContent = revCount;
        if (editorialDecisionEl) editorialDecisionEl.textContent = editorialDecision ? (editorialDecision.decision || editorialDecision) : 'No editorial decision';
        if (reviewerFeedbackEl) reviewerFeedbackEl.textContent = reviewerFeedback.message || 'No reviewer feedback available';
      }
    } catch (err) {
      console.warn('loadReviewDetails error', err);
      if (this.reviewDetailsSection) this.reviewDetailsSection.style.display = 'none';
    }
  }

  async loadRevisionHistory(submissionId) {
    try {
      const json = await this.fetchJson(`${BASE_URL.replace(/\/+$/,'')}/submissions/${submissionId}/revision-history`);
      if (!json || !json.success) {
        if (this.revisionCountDisplay) this.revisionCountDisplay.textContent = '0';
        return;
      }
      const rc = json.revisionCount ?? (Array.isArray(json.revisions) ? json.revisions.length : 0);
      if (this.revisionCountDisplay) this.revisionCountDisplay.textContent = rc;
    } catch (err) {
      console.warn('revision history error', err);
      if (this.revisionCountDisplay) this.revisionCountDisplay.textContent = '0';
    }
  }

  async loadLatestTimeline(submissionId) {
    try {
      const res = await this.fetchJson(`${BASE_URL.replace(/\/+$/,'')}/submissions/${submissionId}/history`);
      const timelineSrc = res.submission || res;
      const history = timelineSrc.history || [];
      if (!history.length) {
        if (this.recentTimeline) this.recentTimeline.innerHTML = `<div style="color:var(--muted)">No timeline events found</div>`;
        return;
      }
      const latest = history[0];
      // try to get user name
      let updatedBy = 'System';
      if (latest.by) {
        try {
          const userJson = await this.fetchJson(`${BASE_URL.replace(/\/+$/,'')}/user/${latest.by}`);
          if (userJson && userJson.user) {
            const u = userJson.user;
            updatedBy = `${u.firstName || ''} ${u.lastName || ''}`.trim() || (u.email || updatedBy);
          }
        } catch (_) { /* ignore */ }
      }
      if (this.recentTimeline) {
        this.recentTimeline.innerHTML = `
           <div class="timeline-item">
             <div class="card">
               <span class="status-badge" style="${this.statusConfig(latest.status || '').style}">${this.escapeHtml((latest.status || '').replace(/_/g,' '))}</span>
               <p class="timeline-comment">${this.escapeHtml(latest.comment || 'No comment provided')}</p>
               <p class="timeline-date"><i class="far fa-clock"></i> ${this.escapeHtml(this.formatDate(latest.date || latest.createdAt || ''))}</p>
               <div class="updated-by"><strong><i class="fas fa-user"></i> Updated by: ${this.escapeHtml(updatedBy)}</strong></div>
             </div>
           </div>
        `;
      }
    } catch (err) {
      console.warn('timeline error', err);
      if (this.recentTimeline) this.recentTimeline.innerHTML = `<div style="color:var(--muted)">Failed to load timeline</div>`;
    }
  }
}

// Start the page
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Create instance -> it will show loading, fetch data and show content
    new SubmissionDetailsManager();
  } catch (e) {
    console.error(e);
    // if anything goes wrong, show a simple error
    const el = document.getElementById('errorMessage');
    if (el) el.textContent = e.message || 'Unexpected error';
  }
});
