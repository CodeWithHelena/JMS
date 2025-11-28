// assets/js/layout.js
// Loads /partials/header.html and /partials/sidebar.html into placeholders and initializes behavior.

// NOTE: set this relative to the page (author/index.html lives in author/)
const partialsPath = '../assets/partials/';

// loadPartial: fetch the partial and REPLACE the placeholder element itself
async function loadPartial(url, placeholderId) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load partial: ' + url);
  const html = await res.text();

  const placeholder = document.getElementById(placeholderId);
  if (!placeholder) {
    // fallback: try injecting into body
    document.body.insertAdjacentHTML('afterbegin', html);
    return;
  }

  // Replace the placeholder element with the returned partial markup.
  placeholder.insertAdjacentHTML('afterend', html);
  placeholder.remove();
}

async function loadLayout() {
  // placeholders in the page: #header-placeholder and #sidebar-placeholder
  await Promise.all([
    loadPartial(partialsPath + 'header.html', 'header-placeholder'),
    loadPartial(partialsPath + 'sidebar.html', 'sidebar-placeholder'),
  ]);

  // Once injected, initialize behavior
  initLayoutBindings();
}

function initLayoutBindings() {
  // Elements (now available in DOM)
  const sidebar = document.getElementById('sidebar');
  const toggleSidebar = document.getElementById('toggleSidebar');
  const toggleIcon = document.getElementById('toggleIcon');
  const hamburger = document.getElementById('hamburger');

  const documentDropdownBtn = document.getElementById('documentDropdown');
  const documentDropdownLi = document.getElementById('documentDropdownLi');
  const documentMenu = document.getElementById('documentMenu');

  const searchIcon = document.getElementById('searchIcon');
  const searchInput = document.getElementById('searchBox');
  const closeSearch = document.getElementById('closeSearch');

  const moreMenu = document.getElementById('moreMenu');
  const moreDropdown = document.getElementById('moreDropdown');

  const userAvatar = document.getElementById('userAvatar');
  const userDropdown = document.getElementById('userDropdown');

  const notificationIcon = document.getElementById('notificationIcon');
  const notificationBox = document.getElementById('notificationBox');

  const searchModalOverlay = document.getElementById('searchModalOverlay');
  const closeSearchModal = document.getElementById('closeSearchModal');
  const cancelSearchBtn = document.getElementById('cancelSearchBtn');
  const moreSearch = document.getElementById('moreSearch');

  const moreNotification = document.getElementById('moreNotification');
  const moreProfile = document.getElementById('moreProfile');
  const moreSettings = document.getElementById('moreSettings');
  const moreLogout = document.getElementById('moreLogout');

  const userProfileLarge = document.getElementById('userProfileLarge');
  const userSettingsLarge = document.getElementById('userSettingsLarge');
  const userLogoutLarge = document.getElementById('userLogoutLarge');

  const themeToggle = document.getElementById('themeToggle');
  const themeLabel = document.getElementById('themeLabel');

  const mainWrapper = document.querySelector('.main-content-wrapper');

  // utils
  function isMobile() { return window.innerWidth <= 768; }
  function isTabletRange() { return window.innerWidth <= 991 && window.innerWidth > 768; }
  function isLarge() { return window.innerWidth >= 992; }

  // Defensive: ensure the header search input is hidden initially
  if (searchInput) searchInput.classList.remove('show');
  if (searchIcon) searchIcon.classList.remove('search-active');

  // Initialize layout state
  function initLayoutState() {
    if (!sidebar) return;

    sidebar.classList.remove('show');
    toggleSidebar && toggleSidebar.classList.remove('open');

    if (isLarge()) {
      sidebar.classList.remove('collapsed');
      if (toggleIcon) { toggleIcon.style.display = 'inline-block'; toggleIcon.className = 'fas fa-arrow-left'; }
      if (hamburger) hamburger.style.display = 'none';
      const headerLogo = document.querySelector('.header-logo'); if (headerLogo) headerLogo.style.display = 'none';

      if (mainWrapper) mainWrapper.classList.remove('sidebar-collapsed');
      if (userAvatar) userAvatar.style.display = 'flex';
      if (moreMenu) moreMenu.style.display = 'none';
    } else if (isTabletRange()) {
      sidebar.classList.add('collapsed');
      if (toggleIcon) { toggleIcon.style.display = 'inline-block'; toggleIcon.className = 'fas fa-arrow-right'; }
      if (hamburger) hamburger.style.display = 'none';
      const headerLogo = document.querySelector('.header-logo'); if (headerLogo) headerLogo.style.display = 'none';

      if (mainWrapper) mainWrapper.classList.add('sidebar-collapsed');
      if (userAvatar) userAvatar.style.display = 'flex';
      if (moreMenu) moreMenu.style.display = 'none';
    } else {
      // mobile
      sidebar.classList.remove('collapsed');
      sidebar.classList.remove('show');
      if (toggleIcon) toggleIcon.style.display = 'none';
      if (hamburger) hamburger.style.display = 'block';
      const headerLogo = document.querySelector('.header-logo'); if (headerLogo) headerLogo.style.display = 'flex';

      if (mainWrapper) mainWrapper.classList.remove('sidebar-collapsed');
      if (userAvatar) userAvatar.style.display = 'none';
      if (moreMenu) moreMenu.style.display = 'flex';
    }
  }

  initLayoutState();
  window.addEventListener('resize', initLayoutState);

  // Toggle sidebar behavior
  if (toggleSidebar && sidebar) {
    toggleSidebar.addEventListener('click', function (e) {
      if (isMobile()) {
        const open = toggleSidebar.classList.toggle('open');
        if (open) {
          sidebar.classList.add('show');
        } else {
          sidebar.classList.remove('show');
        }
        return;
      }

      const collapsed = sidebar.classList.contains('collapsed');
      if (collapsed) {
        sidebar.classList.remove('collapsed');
        toggleIcon && (toggleIcon.className = 'fas fa-arrow-left');
        if (mainWrapper) mainWrapper.classList.remove('sidebar-collapsed');
      } else {
        sidebar.classList.add('collapsed');
        toggleIcon && (toggleIcon.className = 'fas fa-arrow-right');
        if (mainWrapper) mainWrapper.classList.add('sidebar-collapsed');
      }
    });
  }

  // Dropdown (document)
  if (documentDropdownBtn) {
    documentDropdownBtn.addEventListener('click', function (e) {
      const open = this.classList.toggle('active');
      documentMenu && documentMenu.classList.toggle('show', open);
      if (open) documentDropdownLi && documentDropdownLi.classList.add('dropdown-open');
      else documentDropdownLi && documentDropdownLi.classList.remove('dropdown-open');
      e.stopPropagation();
    });
  }

  // ---------------------- Search behavior & "active submit" state ----------------------
  // runSearch: placeholder for actual search submission logic
  function runSearch(query) {
    // Replace this with your real search route or function
    console.log('runSearch →', query);
    // For now, a UI feedback placeholder:
    alert('Searching for: ' + query);
  }

  if (searchInput && searchIcon) {
    // When the user types, toggle the search-active state on the icon
    searchInput.addEventListener('input', function () {
      if (this.value.trim() !== '') {
        searchIcon.classList.add('search-active');
      } else {
        searchIcon.classList.remove('search-active');
      }
    });

    // Click behavior:
    // - If input hidden → open it (and focus)
    // - If input visible and has text → submit search
    // - If input visible and empty → focus the input
    searchIcon.addEventListener('click', function (e) {
      // If search box is not visible, open it
      if (!searchInput.classList.contains('show')) {
        searchInput.classList.add('show');
        setTimeout(() => searchInput.focus(), 50);
        return;
      }

      // If visible and has text -> run search
      const q = (searchInput.value || '').trim();
      if (q !== '') {
        runSearch(q);
        return;
      }

      // visible but empty -> focus for typing
      searchInput.focus();
    });

    // X button clears the input, hides the box and resets icon state
    if (closeSearch) {
      closeSearch.addEventListener('click', function () {
        searchInput.value = '';
        searchInput.classList.remove('show');
        searchIcon.classList.remove('search-active');
      });
    }
  }

  // ---------------------- user menu, more menu, notifications etc (unchanged) ----------------------

  // User avatar menu (large screens)
  if (userAvatar) {
    userAvatar.addEventListener('click', function (e) {
      if (isMobile()) return;
      const shown = userDropdown.classList.contains('show');
      hideMoreDropdown();
      hideNotificationBox();

      if (shown) userDropdown.classList.remove('show');
      else userDropdown.classList.add('show');
      e.stopPropagation();
    });
  }

  // user menu actions (large)
  if (userProfileLarge) userProfileLarge.addEventListener('click', e => { userDropdown.classList.remove('show'); alert('Open My Profile (large screen)'); e.preventDefault(); });
  if (userSettingsLarge) userSettingsLarge.addEventListener('click', e => { userDropdown.classList.remove('show'); alert('Open Settings (large screen)'); e.preventDefault(); });
  if (userLogoutLarge) userLogoutLarge.addEventListener('click', e => { userDropdown.classList.remove('show'); alert('Perform logout (large screen)'); e.preventDefault(); });

  // More (three dot) menu (mobile)
  if (moreMenu) {
    moreMenu.addEventListener('click', function (e) {
      const show = moreDropdown.classList.contains('show');
      if (userDropdown) userDropdown.classList.remove('show');
      hideNotificationBox();

      if (show) hideMoreDropdown();
      else showMoreDropdown();
      e.stopPropagation();
    });
  }

  function showMoreDropdown() { if (moreDropdown) moreDropdown.classList.add('show'); }
  function hideMoreDropdown() { if (moreDropdown) moreDropdown.classList.remove('show'); }

  // More menu items
  if (moreSearch) moreSearch.addEventListener('click', function (e) { hideMoreDropdown(); openSearchModal(); e.preventDefault(); });
  if (moreProfile) moreProfile.addEventListener('click', function (e) { hideMoreDropdown(); alert('Open My Profile (small)'); e.preventDefault(); });

  if (moreNotification) {
    moreNotification.addEventListener('click', function (e) {
      e.stopPropagation();
      hideMoreDropdown();
      showNotificationBox();
      e.preventDefault();
    });
  }

  if (moreSettings) moreSettings.addEventListener('click', function (e) { hideMoreDropdown(); alert('Open Settings (small)'); e.preventDefault(); });
  if (moreLogout) moreLogout.addEventListener('click', function (e) { hideMoreDropdown(); alert('Logout (small)'); e.preventDefault(); });

  // Notification icon (large)
  if (notificationIcon) {
    notificationIcon.addEventListener('click', function (e) {
      hideMoreDropdown();
      if (userDropdown) userDropdown.classList.remove('show');
      toggleNotificationBox();
      e.stopPropagation();
    });
  }

  function toggleNotificationBox() {
    if (!notificationBox) return;
    const show = notificationBox.classList.contains('show');
    if (show) hideNotificationBox();
    else showNotificationBox();
  }
  function showNotificationBox() { if (notificationBox) notificationBox.classList.add('show'); }
  function hideNotificationBox() { if (notificationBox) notificationBox.classList.remove('show'); }

  // Notification clear all
  const clearAll = document.getElementById('clearAllNotif');
  if (clearAll) {
    clearAll.addEventListener('click', function () {
      const notifBody = document.getElementById('notifBody');
      if (notifBody) notifBody.innerHTML = '<div style="padding:12px;color:var(--text-light)">No notifications</div>';
      const notifCount = document.getElementById('notifCount');
      if (notifCount) notifCount.textContent = '0';
      const moreBadge = document.querySelector('#moreNotification .notification-badge');
      if (moreBadge) moreBadge.textContent = '0';
    });
  }

  // View all notifications
  const viewAllNotifications = document.getElementById('viewAllNotifications');
  if (viewAllNotifications) {
    viewAllNotifications.addEventListener('click', function (e) {
      hideNotificationBox();
      alert('Open all notifications page (placeholder)');
      e.preventDefault();
    });
  }

  // Search modal functionality
  function openSearchModal() {
    if (!searchModalOverlay) return;
    searchModalOverlay.classList.add('show');
    searchModalOverlay.setAttribute('aria-hidden', 'false');
    const input = document.getElementById('modalSearchInput');
    if (input) input.focus();
  }
  function closeSearchModalFunc() {
    if (!searchModalOverlay) return;
    searchModalOverlay.classList.remove('show');
    searchModalOverlay.setAttribute('aria-hidden', 'true');
  }
  if (closeSearchModal) closeSearchModal.addEventListener('click', closeSearchModalFunc);
  if (cancelSearchBtn) cancelSearchBtn.addEventListener('click', closeSearchModalFunc);
  if (searchModalOverlay) {
    searchModalOverlay.addEventListener('click', function (e) {
      if (e.target === searchModalOverlay) closeSearchModalFunc();
    });
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', function (e) {
    const avatarEl = document.getElementById('userAvatar');
    if (!avatarEl || !avatarEl.contains(e.target)) {
      if (userDropdown) userDropdown.classList.remove('show');
    }
    if (!moreMenu || !moreMenu.contains(e.target)) hideMoreDropdown();
    if (!notificationBox || (!notificationBox.contains(e.target) && !notificationIcon.contains(e.target))) hideNotificationBox();
    if (!documentDropdownBtn || (!documentDropdownBtn.contains(e.target) && !documentMenu.contains(e.target))) {
      if (documentDropdownBtn) documentDropdownBtn.classList.remove('active');
      if (documentMenu) documentMenu.classList.remove('show');
      if (documentDropdownLi) documentDropdownLi.classList.remove('dropdown-open');
    }
  });

  // Sidebar links close overlay on mobile
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.addEventListener('click', function () {
      if (isMobile()) {
        sidebar.classList.remove('show');
        toggleSidebar.classList.remove('open');
      }
    });
  });

  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener('click', function (e) {
      e.preventDefault();
      document.body.classList.toggle('dark-mode');
      const icon = this.querySelector('i');
      const label = this.querySelector('span') || themeLabel;
      if (document.body.classList.contains('dark-mode')) {
        if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
        if (label) label.textContent = 'Light Mode';
      } else {
        if (icon) { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); }
        if (label) label.textContent = 'Dark Mode';
      }
    });
  }

  // Accessibility: ESC to close overlays
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (searchInput && searchInput.classList.contains('show')) searchInput.classList.remove('show');
      hideMoreDropdown();
      if (userDropdown) userDropdown.classList.remove('show');
      hideNotificationBox();
      closeSearchModalFunc();
      if (sidebar) sidebar.classList.remove('show');
      if (toggleSidebar) toggleSidebar.classList.remove('open');
      if (searchIcon) searchIcon.classList.remove('search-active');
    }
  });

  // done
}

// kick it off
loadLayout().catch(err => console.error('Error loading layout:', err));
