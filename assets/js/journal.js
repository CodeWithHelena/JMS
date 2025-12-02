// journal.js - Reusable journal select component
const BASE_URL = 'https://fp.247laboratory.net/';

/**
 * Initialize the journal select component
 * Assumes standard HTML structure with IDs: 
 * - #journalSelect (container)
 * - #selectedJournal (hidden input)
 */
export function initJournalSelect() {
    // Get DOM elements using fixed IDs
    const journalSelect = document.getElementById('journalSelect');
    const selectedJournal = document.getElementById('selectedJournal');
    
    if (!journalSelect) {
        console.error('Journal select container #journalSelect not found');
        return null;
    }
    
    if (!selectedJournal) {
        console.error('Hidden input #selectedJournal not found');
        return null;
    }

    const selectHeader = journalSelect.querySelector('.select-header');
    const selectDropdown = journalSelect.querySelector('.select-dropdown');
    const selectArrow = journalSelect.querySelector('.select-arrow');
    const journalSearch = journalSelect.querySelector('.select-search-container input');
    const searchClear = journalSelect.querySelector('.search-clear');
    const journalOptions = journalSelect.querySelector('.select-options');
    const placeholderElement = selectHeader.querySelector('.select-placeholder');

    let journalsCache = [];

    // Helper functions
    function getJournalDisplayName(item) {
        if (typeof item === 'string') return item;
        if (!item) return '';
        return item.title || item.name || item.journalName || item.shortTitle || item._id || JSON.stringify(item);
    }

    function getJournalId(item) {
        if (!item) return '';
        if (typeof item === 'string') return item;
        return item._id || item.id || getJournalDisplayName(item);
    }

    function populateJournalOptions(filter = '') {
        if (!journalOptions) return;
        
        journalOptions.innerHTML = '';
        const filtered = journalsCache.filter(j =>
            getJournalDisplayName(j).toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'select-option';
            noResults.textContent = 'No journals found';
            noResults.style.color = 'var(--text-light)';
            noResults.style.cursor = 'default';
            journalOptions.appendChild(noResults);
            return;
        }

        filtered.forEach(j => {
            const option = document.createElement('div');
            option.className = 'select-option';
            const name = getJournalDisplayName(j);
            const id = getJournalId(j);
            option.textContent = name;
            option.dataset.jid = id;
            option.addEventListener('click', function () {
                if (placeholderElement) {
                    placeholderElement.textContent = name;
                }
                selectedJournal.value = id;
                selectHeader.classList.remove('open');
                selectDropdown.style.display = 'none';
                selectArrow.classList.remove('open');
            });
            journalOptions.appendChild(option);
        });
    }

    // Fetch journals from API
    async function getJournals() {
        const token = localStorage.getItem('token') || null;
        
        try {
            const url = new URL('api/v1/journal/shallow', BASE_URL).toString();
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            if (!res.ok) {
                console.error('Failed to fetch journals', res.status, res.statusText);
                return [];
            }

            const payload = await res.json();
            if (Array.isArray(payload)) return payload;
            if (Array.isArray(payload.data)) return payload.data;
            if (Array.isArray(payload.journals)) return payload.journals;
            const arr = Object.values(payload).find(v => Array.isArray(v));
            if (Array.isArray(arr)) return arr;
            return [];
        } catch (err) {
            console.error('Error fetching journals:', err);
            return [];
        }
    }

    // Load and populate journals
    async function loadJournalsAndPopulate() {
        const remote = await getJournals();
        if (remote && remote.length) {
            journalsCache = remote;
            populateJournalOptions();
        }
    }

    // Event listeners
    selectHeader.addEventListener('click', function () {
        const isOpen = selectHeader.classList.contains('open');

        if (isOpen) {
            selectHeader.classList.remove('open');
            selectDropdown.style.display = 'none';
            selectArrow.classList.remove('open');
        } else {
            selectHeader.classList.add('open');
            selectDropdown.style.display = 'block';
            selectArrow.classList.add('open');
            if (journalSearch) journalSearch.focus();
        }
    });

    if (journalSearch) {
        journalSearch.addEventListener('input', function () {
            populateJournalOptions(this.value);
        });
    }

    if (searchClear) {
        searchClear.addEventListener('click', function () {
            if (journalSearch) {
                journalSearch.value = '';
                populateJournalOptions();
                journalSearch.focus();
            }
        });
    }

    document.addEventListener('click', function (e) {
        if (!journalSelect.contains(e.target)) {
            selectHeader.classList.remove('open');
            selectDropdown.style.display = 'none';
            selectArrow.classList.remove('open');
        }
    });

    // Public methods
    const journalSelectInstance = {
        // Get the selected journal ID
        getSelectedValue: () => selectedJournal.value,
        
        // Get the selected journal object
        getSelectedItem: () => {
            const selectedId = selectedJournal.value;
            return journalsCache.find(j => getJournalId(j) === selectedId);
        },
        
        // Clear the selection
        clearSelection: () => {
            selectedJournal.value = '';
            if (placeholderElement) {
                placeholderElement.textContent = 'Select journal';
            }
        },
        
        // Refresh the journal list
        refresh: () => loadJournalsAndPopulate(),
        
        // Manually set a journal by ID
        setSelectedValue: (journalId) => {
            const journal = journalsCache.find(j => getJournalId(j) === journalId);
            if (journal && placeholderElement) {
                placeholderElement.textContent = getJournalDisplayName(journal);
                selectedJournal.value = journalId;
            }
        },
        
        // Get all available journals
        getAvailableJournals: () => [...journalsCache]
    };

    // Initialize
    loadJournalsAndPopulate();
    
    return journalSelectInstance;
}