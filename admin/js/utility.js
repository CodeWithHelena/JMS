// API Configuration
export const API_BASE_URL = 'https://fp.247laboratory.net/';
const API_ENDPOINTS = {
    EDITORS: 'api/v1/user?role=editor',
    JOURNAL: 'api/v1/journal'
};

// Get token from localStorage
function getAuthToken() {
    return localStorage.getItem('pilot_tkn');
}

// Reusable Custom Select Component (without search)
export function createCustomSelect(options) {
    const {
        container,
        placeholder = 'Select an option',
        options: optionList = [],
        onSelect,
        valueField = 'value',
        labelField = 'label'
    } = options;

    // Generate unique ID for this instance
    const instanceId = 'customSelect_' + Math.random().toString(36).substr(2, 9);
    
    // Create HTML structure
    const html = `
        <div class="custom-select" id="${instanceId}">
            <div class="select-header">
                <span class="placeholder">${placeholder}</span>
                <span class="selected-value"></span>
                <span class="arrow"><i class="fas fa-chevron-down"></i></span>
            </div>
            <div class="select-dropdown">
                <div class="select-options-list">
                    ${renderOptions(optionList)}
                </div>
            </div>
        </div>
        <input type="hidden" id="${instanceId}_input">
    `;

    // Insert into container
    container.innerHTML = html;

    // Get DOM elements
    const selectElement = document.getElementById(instanceId);
    const hiddenInput = document.getElementById(`${instanceId}_input`);
    const header = selectElement.querySelector('.select-header');
    const dropdown = selectElement.querySelector('.select-dropdown');
    const optionsList = selectElement.querySelector('.select-options-list');
    const selectedValueSpan = selectElement.querySelector('.selected-value');

    // State
    let selectedItem = null;

    // Render options
    function renderOptions(options) {
        if (options.length === 0) {
            return '<div class="no-results">No options available</div>';
        }

        return options.map(option => `
            <div class="select-option-item" data-value="${option[valueField]}">
                <div class="option-text">
                    <span class="option-name">${option[labelField]}</span>
                </div>
            </div>
        `).join('');
    }

    // Update selected value display
    function updateSelectedDisplay() {
        if (selectedItem) {
            selectedValueSpan.textContent = selectedItem[labelField];
            selectedValueSpan.style.display = 'inline';
            hiddenInput.value = selectedItem[valueField];
        } else {
            selectedValueSpan.textContent = '';
            selectedValueSpan.style.display = 'none';
            hiddenInput.value = '';
        }
    }

    // Select an option
    function selectOption(option) {
        selectedItem = option;
        updateSelectedDisplay();
        
        // Close dropdown
        dropdown.classList.remove('active');
        header.classList.remove('active');
        
        // Call callback if provided
        if (onSelect) {
            onSelect(selectedItem);
        }
    }

    // Event Listeners
    header.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropdown.classList.toggle('active');
        header.classList.toggle('active');
    });

    optionsList.addEventListener('click', (e) => {
        const optionItem = e.target.closest('.select-option-item');
        if (optionItem) {
            const optionValue = optionItem.getAttribute('data-value');
            const option = optionList.find(opt => opt[valueField] === optionValue);
            if (option) {
                selectOption(option);
            }
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!selectElement.contains(e.target)) {
            dropdown.classList.remove('active');
            header.classList.remove('active');
        }
    });

    // Initialize
    updateSelectedDisplay();

    // Public API
    return {
        getSelected: () => selectedItem,
        getValue: () => selectedItem ? selectedItem[valueField] : '',
        setSelected: (value) => {
            const option = optionList.find(opt => opt[valueField] === value);
            if (option) {
                selectOption(option);
            }
        },
        setOptions: (newOptions) => {
            optionList.length = 0;
            optionList.push(...newOptions);
            optionsList.innerHTML = renderOptions(newOptions);
        },
        getHiddenInput: () => hiddenInput,
        destroy: () => {
            selectElement.remove();
            hiddenInput.remove();
        }
    };
}

// Reusable Editor Select Component (with search and API integration)
export async function createEditorSelect(options) {
    const {
        container,
        placeholder = 'Search for editors...',
        multiple = false,
        maxDisplay = 5,
        onSelect
    } = options;

    // Generate unique ID for this instance
    const instanceId = 'editorSelect_' + Math.random().toString(36).substr(2, 9);
    
    // Create HTML structure
    const html = `
        <div class="custom-search-select" id="${instanceId}">
            <div class="select-header">
                <span class="placeholder">${placeholder}</span>
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
                    <div class="no-results">Loading editors...</div>
                </div>
            </div>
        </div>
    `;

    // Insert into container
    container.innerHTML = html;

    // Get DOM elements
    const selectElement = document.getElementById(instanceId);
    const header = selectElement.querySelector('.select-header');
    const dropdown = selectElement.querySelector('.select-dropdown');
    const searchInput = selectElement.querySelector('.search-input');
    const clearSearchBtn = selectElement.querySelector('.clear-search');
    const optionsList = selectElement.querySelector('.select-options-list');
    const selectedValueSpan = selectElement.querySelector('.selected-value');

    // State
    let selectedItems = [];
    let allEditors = [];
    let filteredEditors = [];

    // Fetch editors from API with authentication
    async function fetchEditors() {
        const token = getAuthToken();
        
        if (!token) {
            optionsList.innerHTML = '<div class="no-results">Authentication required. Please login.</div>';
            console.error('No authentication token found in localStorage');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.EDITORS}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    optionsList.innerHTML = '<div class="no-results">Session expired. Please login again.</div>';
                    console.error('Authentication failed: Token invalid or expired');
                    return;
                }
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle both array and object responses
            let editorsData = data;
            if (data.data && Array.isArray(data.data)) {
                editorsData = data.data;
            } else if (data.users && Array.isArray(data.users)) {
                editorsData = data.users;
            } else if (Array.isArray(data)) {
                editorsData = data;
            } else {
                console.error('Unexpected API response format:', data);
                editorsData = [];
            }
            
            // Transform API response to match our expected format
            allEditors = editorsData.map(editor => ({
                id: editor._id || editor.id,
                name: editor.fullName || `${editor.firstName || ''} ${editor.lastName || ''}`.trim(),
                email: editor.email,
                role: editor.role
            })).filter(editor => editor.id && editor.name);
            
            filteredEditors = [...allEditors];
            updateOptionsDisplay();
        } catch (error) {
            console.error('Error fetching editors:', error);
            optionsList.innerHTML = '<div class="no-results">Failed to load editors. Please try again.</div>';
        }
    }

    // Render options
    function renderOptions(editors) {
        if (editors.length === 0) {
            return '<div class="no-results">Editor not found</div>';
        }

        return editors.slice(0, maxDisplay).map(editor => `
            <div class="select-option-item" data-id="${editor.id}">
                <div class="option-text">
                    <span class="option-name">${editor.name}</span>
                    ${editor.email ? `<span class="option-email">${editor.email}</span>` : ''}
                </div>
                <div class="add-icon">
                    <i class="fas fa-plus"></i>
                </div>
            </div>
        `).join('');
    }

    // Update options display
    function updateOptionsDisplay() {
        optionsList.innerHTML = renderOptions(filteredEditors);
        
        // Add scroll if more than maxDisplay
        if (filteredEditors.length > maxDisplay) {
            optionsList.style.maxHeight = '250px';
            optionsList.style.overflowY = 'auto';
        } else {
            optionsList.style.maxHeight = 'none';
            optionsList.style.overflowY = 'visible';
        }
    }

    // Filter editors based on search
    function filterEditors(searchTerm) {
        if (!searchTerm.trim()) {
            filteredEditors = [...allEditors];
        } else {
            const searchLower = searchTerm.toLowerCase();
            filteredEditors = allEditors.filter(editor => 
                editor.name.toLowerCase().includes(searchLower) ||
                (editor.email && editor.email.toLowerCase().includes(searchLower))
            );
        }
        updateOptionsDisplay();
    }

    // Update selected value display
    function updateSelectedDisplay() {
        if (selectedItems.length === 0) {
            selectedValueSpan.textContent = '';
            selectedValueSpan.style.display = 'none';
        } else if (selectedItems.length === 1) {
            selectedValueSpan.textContent = selectedItems[0].name;
            selectedValueSpan.style.display = 'inline';
        } else {
            selectedValueSpan.textContent = `${selectedItems.length} selected`;
            selectedValueSpan.style.display = 'inline';
        }
    }

    // Select an option
    function selectOption(editor) {
        if (multiple) {
            // Check if already selected
            const isSelected = selectedItems.some(item => item.id === editor.id);
            if (!isSelected) {
                selectedItems.push(editor);
            }
        } else {
            selectedItems = [editor];
            // Close dropdown for single select
            dropdown.classList.remove('active');
            header.classList.remove('active');
        }
        
        updateSelectedDisplay();
        
        // Call callback if provided
        if (onSelect) {
            onSelect(selectedItems);
        }
    }

    // Clear search input - FIXED to prevent form submission
    function clearSearch(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        searchInput.value = '';
        filteredEditors = [...allEditors];
        updateOptionsDisplay();
        clearSearchBtn.classList.remove('visible');
        searchInput.focus();
    }

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
        filterEditors(e.target.value);
        clearSearchBtn.classList.toggle('visible', e.target.value.trim() !== '');
    });

    // Fixed clear search button handler
    clearSearchBtn.addEventListener('click', clearSearch);

    // Prevent form submission when pressing Enter in search
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });

    optionsList.addEventListener('click', (e) => {
        e.stopPropagation();
        const optionItem = e.target.closest('.select-option-item');
        if (optionItem) {
            const editorId = optionItem.getAttribute('data-id');
            const editor = allEditors.find(ed => ed.id === editorId);
            if (editor) {
                selectOption(editor);
            }
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!selectElement.contains(e.target)) {
            dropdown.classList.remove('active');
            header.classList.remove('active');
        }
    });

    // Initialize
    await fetchEditors();
    updateSelectedDisplay();

    // Public API
    return {
        getSelected: () => selectedItems,
        setSelected: (items) => {
            selectedItems = Array.isArray(items) ? items : [items];
            updateSelectedDisplay();
        },
        removeSelected: (id) => {
            selectedItems = selectedItems.filter(item => item.id !== id);
            updateSelectedDisplay();
        },
        refresh: fetchEditors,
        destroy: () => {
            selectElement.remove();
        }
    };
}

// Convenience functions for common use cases
export async function selectOneEditor(container, placeholder, onSelect) {
    return await createEditorSelect({
        container,
        placeholder: placeholder || 'Select editor...',
        multiple: false,
        maxDisplay: 5,
        onSelect
    });
}

export async function selectMultipleEditors(container, placeholder, onSelect) {
    return await createEditorSelect({
        container,
        placeholder: placeholder || 'Search for editors...',
        multiple: true,
        maxDisplay: 5,
        onSelect
    });
}

// Function to submit journal data
export async function submitJournalData(formData) {
    const token = getAuthToken();
    
    if (!token) {
        throw new Error('Authentication required. Please login.');
    }

    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.JOURNAL}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || `Server error: ${response.status}`);
        }

        return responseData;
    } catch (error) {
        console.error('Error submitting journal:', error);
        throw error;
    }
}


// Function to update journal data
export async function updateJournalData(journalId, formData) {
    const token = getAuthToken();
    
    if (!token) {
        throw new Error('Authentication required. Please login.');
    }

    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.JOURNAL}/${journalId}`, {
            method: 'PUT', // or PATCH depending on your API
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || `Server error: ${response.status}`);
        }

        return responseData;
    } catch (error) {
        console.error('Error updating journal:', error);
        throw error;
    }
}