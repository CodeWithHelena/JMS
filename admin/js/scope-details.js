        import { BASE_URL, token } from '/assets/js/utility.js';
        // Get scope ID from URL
        function getscopeIdFromUrl() {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('id');
        }

        // Format currency
        function formatCurrency(amount, currency = 'NGN') {
            if (amount === null || amount === undefined) return 'N/A';

            try {
                const formatter = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currency,
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                return formatter.format(amount);
            } catch (error) {
                return `${currency} ${amount.toLocaleString()}`;
            }
        }

        // Safely get value from object
        function safeGet(obj, key, defaultValue = 'N/A') {
            if (!obj) return defaultValue;
            const value = obj[key];
            return value !== null && value !== undefined && value !== '' ? value : defaultValue;
        }

        // Extract scope data from API response
        function extractscopeData(response) {
            // Try different response structures
            if (response._id) {
                // Case 1: Direct scope object
                return response;
            } else if (response.data && response.data._id) {
                // Case 2: { data: { ...scope... } }
                return response.data;
            } else if (response.scope && response.scope._id) {
                // Case 3: { scope: { ...scope... } }
                return response.scope;
            } else if (response.success && response.data && response.data._id) {
                // Case 4: { success: true, data: { ...scope... } }
                return response.data;
            } else if (response.success && response.scope && response.scope._id) {
                // Case 5: { success: true, scope: { ...scope... } }
                return response.scope;
            } else {
                // Try to find any object with _id in the response
                for (const key in response) {
                    if (response[key] && typeof response[key] === 'object' && response[key]._id) {
                        return response[key];
                    }
                }
            }
            return null;
        }

        // Get scope details from API
        async function fetchscopeDetails(scopeId) {

            if (!token) {
                Swal.fire({
                    title: 'Authentication Required',
                    text: 'Please login to view scope details',
                    icon: 'warning',
                    confirmButtonColor: '#cc5500'
                }).then(() => {
                    window.location.href = 'login.html';
                });
                return null;
            }

            try {
                const response = await fetch(`${BASE_URL}/scope/${scopeId}`, {
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

                    const errorText = await response.text();
                    console.error(`scope API Error ${response.status}:`, errorText);
                    throw new Error(`Failed to load scope (Status: ${response.status})`);
                }

                return await response.json();
            } catch (error) {
                console.error('Error fetching scope details:', error.message);
                Swal.fire({
                    title: 'Network Error',
                    text: 'Failed to connect to server. Please check your connection.',
                    icon: 'error',
                    confirmButtonColor: '#cc5500'
                });
                throw error;
            }
        }

        // Format date
        function formatDate(dateString) {
            if (!dateString) return 'N/A';
            try {
                const date = new Date(dateString);
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (e) {
                return dateString;
            }
        }

        // Render scope details
        function renderscopeDetails(response) {
            const scopeData = extractscopeData(response);

            if (!scopeData) {
                console.error('Could not extract scope data from API response');
                return `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Data Format Error</h3>
                        <p>Could not extract scope data from server response.</p>
                        <p>Please contact support.</p>
                    </div>
                `;
            }

            // Ensure arrays exist
            const editorsInChief = Array.isArray(scopeData.editorsInChief) ? scopeData.editorsInChief : [];
            const associateEditors = Array.isArray(scopeData.associateEditors) ? scopeData.associateEditors : [];
            const indexing = Array.isArray(scopeData.indexing) ? scopeData.indexing : [];

            // Create HTML
            return `
                <div class="scope-details-card">
                    <div class="scope-header">
                        <h1 class="scope-title">${safeGet(scopeData, 'title', 'Untitled scope')}</h1>
                        <div class="scope-issn">${safeGet(scopeData, 'issn', 'No ISSN')}</div>
                    </div>
                    
                    <div class="scope-body">
                        <!-- Description Section -->
                        <div class="section">
                            <h2 class="section-title">
                                <i class="fas fa-info-circle"></i> Description
                            </h2>
                            <div class="description-content">
                                ${safeGet(scopeData, 'description', 'No description available.')}
                            </div>
                        </div>
    
                        <!-- Basic Information -->
                        <div class="section">
                            <h2 class="section-title">
                                <i class="fas fa-book"></i> Basic Information
                            </h2>
                            <div class="details-grid">
                                <div class="detail-item">
                                    <div class="detail-label">Publisher</div>
                                    <div class="detail-value">${safeGet(scopeData, 'publisher')}</div>
                                </div>
                                
                                <div class="detail-item">
                                    <div class="detail-label">Scope / Topics</div>
                                    <div class="detail-value">${safeGet(scopeData, 'scope')}</div>
                                </div>
                                
                                ${safeGet(scopeData, 'doiPrefix') !== 'N/A' ? `
                                <div class="detail-item">
                                    <div class="detail-label">DOI Prefix</div>
                                    <div class="detail-value">${safeGet(scopeData, 'doiPrefix')}</div>
                                </div>
                                ` : ''}
                                
                                ${safeGet(scopeData, 'reviewPolicy') !== 'N/A' ? `
                                <div class="detail-item">
                                    <div class="detail-label">Review Policy</div>
                                    <div class="detail-value">${safeGet(scopeData, 'reviewPolicy')}</div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
    
                        <!-- Contact Information -->
                        ${(safeGet(scopeData, 'email') !== 'N/A' || safeGet(scopeData, 'website') !== 'N/A') ? `
                        <div class="section">
                            <h2 class="section-title">
                                <i class="fas fa-envelope"></i> Contact Information
                            </h2>
                            <div class="details-grid">
                                ${safeGet(scopeData, 'email') !== 'N/A' ? `
                                <div class="detail-item">
                                    <div class="detail-label">Email</div>
                                    <div class="detail-value">${safeGet(scopeData, 'email')}</div>
                                </div>
                                ` : ''}
                                
                                ${safeGet(scopeData, 'website') !== 'N/A' ? `
                                <div class="detail-item">
                                    <div class="detail-label">Website</div>
                                    <div class="detail-value">
                                        <a href="${scopeData.website}" 
                                           target="_blank" 
                                           rel="noopener noreferrer"
                                           style="color: var(--brand); text-decoration: none;">
                                            ${scopeData.website}
                                        </a>
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        ` : ''}
    
                        <!-- Fees Section -->
                        ${(scopeData.submissionFee !== undefined || scopeData.publicationFee !== undefined) ? `
                        <div class="section">
                            <h2 class="section-title">
                                <i class="fas fa-money-bill-wave"></i> Fees
                            </h2>
                            <div class="fee-info">
                                ${scopeData.submissionFee !== undefined ? `
                                <div class="fee-item">
                                    <div class="fee-label">Submission Fee</div>
                                    <div class="fee-amount">
                                        ${formatCurrency(scopeData.submissionFee, scopeData.currency || 'NGN')}
                                    </div>
                                </div>
                                ` : ''}
                                
                                ${scopeData.publicationFee !== undefined ? `
                                <div class="fee-item">
                                    <div class="fee-label">Publication Fee</div>
                                    <div class="fee-amount">
                                        ${formatCurrency(scopeData.publicationFee, scopeData.currency || 'NGN')}
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        ` : ''}
    
                        <!-- Editorial Team Section -->
                        ${(editorsInChief.length > 0 || associateEditors.length > 0) ? `
                        <div class="section">
                            <h2 class="section-title">
                                <i class="fas fa-users"></i> Editorial Team
                            </h2>
                            
                            ${editorsInChief.length > 0 ? `
                                <h3 style="margin-bottom: 15px; color: var(--text-color); font-size: 16px;">
                                    Editors-in-Chief
                                </h3>
                                <div class="editor-list">
                                    ${editorsInChief.map(editor => `
                                        <div class="editor-card">
                                            <div class="editor-name">
                                                ${safeGet(editor, 'firstName', '')} ${safeGet(editor, 'lastName', '')}
                                            </div>
                                            ${safeGet(editor, 'email') !== 'N/A' ? `
                                            <div class="editor-email">${safeGet(editor, 'email')}</div>
                                            ` : ''}
                                            <span class="editor-role">Editor-in-Chief</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            ${associateEditors.length > 0 ? `
                                <h3 style="margin: 25px 0 15px; color: var(--text-color); font-size: 16px;">
                                    Associate Editors
                                </h3>
                                <div class="editor-list">
                                    ${associateEditors.map(editor => `
                                        <div class="editor-card">
                                            <div class="editor-name">
                                                ${safeGet(editor, 'firstName', '')} ${safeGet(editor, 'lastName', '')}
                                            </div>
                                            ${safeGet(editor, 'email') !== 'N/A' ? `
                                            <div class="editor-email">${safeGet(editor, 'email')}</div>
                                            ` : ''}
                                            <span class="editor-role">Associate Editor</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                        ` : ''}
    
                        <!-- Indexing Services -->
                        ${indexing.length > 0 ? `
                        <div class="section">
                            <h2 class="section-title">
                                <i class="fas fa-search"></i> Indexing Services
                            </h2>
                            <div class="indexing-list">
                                ${indexing.map(item => `
                                    <div class="indexing-item">
                                        <div class="indexing-name">${safeGet(item, 'name', 'Unnamed Service')}</div>
                                        ${safeGet(item, 'url') !== 'N/A' ? `
                                        <div class="indexing-url">
                                            <a href="${item.url}" 
                                               target="_blank" 
                                               rel="noopener noreferrer"
                                               style="color: var(--brand);">
                                                <i class="fas fa-external-link-alt"></i>
                                            </a>
                                        </div>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
    
                        <!-- Timestamps -->
                        <div class="section">
                            <h2 class="section-title">
                                <i class="fas fa-clock"></i> Timestamps
                            </h2>
                            <div class="details-grid">
                                <div class="detail-item">
                                    <div class="detail-label">Created</div>
                                    <div class="detail-value">${formatDate(scopeData.createdAt)}</div>
                                </div>
                                
                                <div class="detail-item">
                                    <div class="detail-label">Last Updated</div>
                                    <div class="detail-value">${formatDate(scopeData.updatedAt)}</div>
                                </div>
                            </div>
                        </div>
    
                        <!-- Action Buttons -->
                        <div class="action-buttons">
                            <a href="scopes.html" class="action-btn back-list-btn">
                                <i class="fas fa-list"></i> Back to List
                            </a>
                            ${scopeData._id ? `
                            <a href="edit-scope.html?id=${scopeData._id}" class="action-btn edit-btn">
                                <i class="fas fa-edit"></i> Edit scope
                            </a>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        // Main function
        document.addEventListener('DOMContentLoaded', async function () {
            const scopeDetails = document.getElementById('scopeDetails');
            const scopeId = getscopeIdFromUrl();

            if (!scopeId) {
                scopeDetails.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>scope Not Found</h3>
                        <p>No scope ID specified in the URL.</p>
                        <a href="scopes.html" class="action-btn back-list-btn" style="display: inline-flex; margin-top: 20px;">
                            <i class="fas fa-arrow-left"></i> Back to scopes
                        </a>
                    </div>
                `;
                return;
            }

            try {
                const response = await fetchscopeDetails(scopeId);

                if (!response) {
                    throw new Error('No response received from server');
                }

                scopeDetails.innerHTML = renderscopeDetails(response);

            } catch (error) {
                console.error('Error loading scope details:', error.message);
                scopeDetails.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Error Loading scope</h3>
                        <p>${error.message || 'Failed to load scope details. Please try again.'}</p>
                        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                            <a href="scopes.html" class="action-btn back-list-btn" style="display: inline-flex;">
                                <i class="fas fa-arrow-left"></i> Back to scopes
                            </a>
                            <button onclick="location.reload()" class="action-btn edit-btn" style="display: inline-flex;">
                                <i class="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    </div>
                `;
            }
        });

        // Add error handling for unhandled promises
        window.addEventListener('unhandledrejection', function (event) {
            console.error('Unhandled promise rejection:', event.reason);
            const scopeDetails = document.getElementById('scopeDetails');
            if (scopeDetails) {
                scopeDetails.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Application Error</h3>
                        <p>An unexpected error occurred. Please refresh the page.</p>
                    </div>
                `;
            }
        });