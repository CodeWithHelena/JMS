// Import utility functions
import {createCustomSelect} from './utility.js';
 import { BASE_URL, token } from '/assets/js/utility.js';



// Get token from localStorage
function getAuthToken() {
    return localStorage.getItem('pilot_tkn');
}

// Fetch users from API
async function fetchUsers(page = 1, limit = 10, role = '', search = '') {
    
    if (!token) {
        Swal.fire({
            title: 'Authentication Required',
            text: 'Please login to view users',
            icon: 'warning',
            confirmButtonColor: '#cc5500'
        }).then(() => {
            window.location.href = 'login.html';
        });
        return null;
    }

    try {
        // Build query parameters
        let url = `${BASE_URL}/user?page=${page}&limit=${limit}`;
        
        if (role) {
            url += `&role=${role}`;
        }
        
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }

        const response = await fetch(url, {
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
        console.error('Error fetching users:', error);
        Swal.fire({
            title: 'Error',
            text: 'Failed to load users. Please try again.',
            icon: 'error',
            confirmButtonColor: '#cc5500'
        });
        return null;
    }
}

// Truncate text with ellipsis
function truncateText(text, maxLength = 25) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Get role class for styling - UNIQUE COLORS
function getRoleClass(role) {
    const roleLower = (role || '').toLowerCase();
    switch (roleLower) {
        case 'editor':
            return 'role-editor';
        case 'author':
            return 'role-author';
        case 'reviewer':
            return 'role-reviewer';
        case 'admin':
            return 'role-editor'; // Fallback to editor style if admin users exist
        default:
            return 'role-editor';
    }
}

// Get status class for styling - DIFFERENT COLORS
function getStatusClass(user) {
    if (!user.isVerified) return 'status-pending';
    return user.isActive ? 'status-active' : 'status-inactive';
}

// Get status text
function getStatusText(user) {
    if (!user.isVerified) return 'Pending';
    return user.isActive ? 'Active' : 'Inactive';
}

// Render user table row
function renderUserRow(user, index, currentPage, itemsPerPage) {
    const sn = ((currentPage - 1) * itemsPerPage) + index + 1;
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const truncatedName = truncateText(fullName, 25);
    const truncatedEmail = truncateText(user.email || '', 30);
    
    return `
        <tr>
            <td>${sn}</td>
            <td>
                <div class="user-name">
                    <span class="full-name" title="${fullName}">${truncatedName}</span>
                </div>
            </td>
            <td>
                <span class="user-email" title="${user.email || ''}">${truncatedEmail}</span>
            </td>
            <td>
                <span class="user-role ${getRoleClass(user.role)}">${user.role || 'N/A'}</span>
            </td>
            <td>
                <span class="user-status ${getStatusClass(user)}">${getStatusText(user)}</span>
            </td>
            <td>
                <button class="action-btn btn-brand view-more-btn" data-id="${user._id}">
                    <i class="fas fa-eye"></i> View More
                </button>
            </td>
        </tr>
    `;
}

// Render user card for mobile
function renderUserCard(user, index, currentPage, itemsPerPage) {
    const sn = ((currentPage - 1) * itemsPerPage) + index + 1;
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const truncatedName = truncateText(fullName, 20);
    
    return `
        <div class="user-card">
            <div class="user-card-header">
                <div class="user-card-info">
                    <div class="user-card-name" title="${fullName}">${sn}. ${truncatedName}</div>
                    <div class="user-card-email" title="${user.email || ''}">${user.email || 'No email'}</div>
                </div>
                <span class="user-card-role ${getRoleClass(user.role)}">${user.role || 'N/A'}</span>
            </div>
            <div class="user-card-footer">
                <span class="user-status ${getStatusClass(user)}">${getStatusText(user)}</span>
                <button class="action-btn btn-brand view-more-btn" data-id="${user._id}" style="padding: 6px 12px; font-size: 13px;">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
    `;
}

// Render pagination - ALWAYS SHOW EVEN IF ONLY ONE PAGE
function renderPagination(currentPage, totalPages) {
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

    // Always show at least page 1
    if (totalPages === 0) {
        paginationHTML += `
            <button class="page-btn active" data-page="1">
                1
            </button>
        `;
    } else {
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }
    }

    // Next button
    paginationHTML += `
        <button class="page-btn next-btn ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}" 
                ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    return paginationHTML;
}

// Render users stats
function renderUsersStats(total, page, limit) {
    const start = ((page - 1) * limit) + 1;
    const end = Math.min(page * limit, total);
    
    if (total === 0) {
        return 'No users found';
    }
    
    return `Showing ${start} to ${end} of ${total} users`;
}

// Initialize custom selects
let roleSelectInstance = null;
let statusSelectInstance = null;

// Initialize custom selects
function initializeCustomSelects() {
    // Role options - REMOVED ADMIN
    const roleOptions = [
        { value: '', label: 'All Roles' },
        { value: 'author', label: 'Author' },
        { value: 'editor', label: 'Editor' },
        { value: 'reviewer', label: 'Reviewer' }
        // Removed: { value: 'admin', label: 'Admin' }
    ];
    
    // Status options
    const statusOptions = [
        { value: '', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'pending', label: 'Pending' }
    ];
    
    // Initialize Role Select
    roleSelectInstance = createCustomSelect({
        container: document.getElementById('roleSelectContainer'),
        placeholder: 'Select role',
        options: roleOptions,
        onSelect: (selected) => {
            document.getElementById('roleFilter').value = selected.value;
        }
    });
    
    // Initialize Status Select
    statusSelectInstance = createCustomSelect({
        container: document.getElementById('statusSelectContainer'),
        placeholder: 'Select status',
        options: statusOptions,
        onSelect: (selected) => {
            document.getElementById('statusFilter').value = selected.value;
        }
    });
}

// Main application
document.addEventListener('DOMContentLoaded', async function() {
    // DOM Elements
    const usersTableBody = document.getElementById('usersTableBody');
    const mobileUsersList = document.getElementById('mobileUsersList');
    const usersStats = document.getElementById('usersStats');
    const pagination = document.getElementById('pagination');
    const emptyState = document.getElementById('emptyState');
    const usersTableContainer = document.getElementById('usersTableContainer');
    const searchInput = document.getElementById('searchInput');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');
    const searchButton = document.getElementById('searchButton');
    const clearButton = document.getElementById('clearButton');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const addUserBtn = document.getElementById('addUserBtn');

    // State
    let currentPage = 1;
    const itemsPerPage = 10;
    let totalPages = 1;
    let totalUsers = 0;
    let currentRole = '';
    let currentSearch = '';
    let currentStatus = '';

    // Initialize custom selects
    initializeCustomSelects();

    // Load initial users
    await loadUsers(currentPage);

    // Search button click handler
    searchButton.addEventListener('click', async () => {
        currentSearch = searchInput.value.trim();
        currentRole = roleFilter.value;
        currentStatus = statusFilter.value;
        currentPage = 1;
        await loadUsers(currentPage);
    });

    // Clear button click handler
    clearButton.addEventListener('click', () => {
        clearFilters();
    });

    // Clear filters button in empty state
    clearFiltersBtn.addEventListener('click', () => {
        clearFilters();
    });

    // Enter key in search input
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchButton.click();
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
            
            await loadUsers(currentPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Handle view more button click
    usersTableBody.addEventListener('click', (e) => {
        const viewButton = e.target.closest('.view-more-btn');
        if (viewButton) {
            const userId = viewButton.getAttribute('data-id');
            window.location.href = `user-details.html?id=${userId}`;
        }
    });

    // Handle mobile view button click
    mobileUsersList.addEventListener('click', (e) => {
        const viewButton = e.target.closest('.view-more-btn');
        if (viewButton) {
            const userId = viewButton.getAttribute('data-id');
            window.location.href = `user-details.html?id=${userId}`;
        }
    });

    // Add user button click
    addUserBtn.addEventListener('click', () => {
        window.location.href = 'create-user.html';
    });

    // Clear all filters
    function clearFilters() {
        searchInput.value = '';
        if (roleSelectInstance) {
            roleSelectInstance.setSelected('');
        }
        if (statusSelectInstance) {
            statusSelectInstance.setSelected('');
        }
        roleFilter.value = '';
        statusFilter.value = '';
        currentSearch = '';
        currentRole = '';
        currentStatus = '';
        currentPage = 1;
        loadUsers(currentPage);
    }

    // Load users function
    async function loadUsers(page) {
        // Show loading
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="loading">
                        <div class="loading-spinner"></div>
                    </div>
                </td>
            </tr>
        `;
        
        mobileUsersList.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
            </div>
        `;

        // First fetch all users, then filter by status client-side
        const response = await fetchUsers(page, itemsPerPage, currentRole, currentSearch);
        
        if (!response) {
            showEmptyState();
            return;
        }

        const { users, total, page: current, pages } = response;
        
        // Filter by status if selected
        let filteredUsers = users || [];
        if (currentStatus) {
            filteredUsers = filteredUsers.filter(user => {
                if (currentStatus === 'active') return user.isActive === true;
                if (currentStatus === 'inactive') return user.isActive === false;
                if (currentStatus === 'pending') return !user.isVerified || user.isVerified === false;
                return true;
            });
        }
        
        currentPage = current || page;
        totalPages = pages || Math.ceil((total || 0) / itemsPerPage);
        totalUsers = filteredUsers.length;

        if (filteredUsers.length === 0) {
            showEmptyState();
        } else {
            hideEmptyState();
            
            // Render table rows
            const tableRows = filteredUsers.map((user, index) => 
                renderUserRow(user, index, currentPage, itemsPerPage)
            ).join('');
            usersTableBody.innerHTML = tableRows;
            
            // Render mobile cards
            const mobileCards = filteredUsers.map((user, index) => 
                renderUserCard(user, index, currentPage, itemsPerPage)
            ).join('');
            mobileUsersList.innerHTML = mobileCards;
            
            // Update stats and pagination
            usersStats.innerHTML = renderUsersStats(totalUsers, currentPage, itemsPerPage);
            pagination.innerHTML = renderPagination(currentPage, totalPages);
        }
    }

    // Show empty state
    function showEmptyState() {
        usersTableBody.innerHTML = '';
        mobileUsersList.innerHTML = '';
        usersStats.innerHTML = 'No users found';
        pagination.innerHTML = renderPagination(1, 0); // Show pagination even when empty
        emptyState.style.display = 'block';
        usersTableContainer.style.display = 'none';
    }

    // Hide empty state
    function hideEmptyState() {
        emptyState.style.display = 'none';
        usersTableContainer.style.display = 'block';
    }
});