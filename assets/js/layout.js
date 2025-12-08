// assets/js/layout.js
// Loads /partials/header.html and /partials/sidebar-base.html and then injects module-specific sidebar items.
// Also wires up header interactions (search, notifications, more menu) and sidebar dropdowns.
// Written to be defensive about missing elements.

const partialsPath = '../assets/partials/';

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch: ' + url + ' (' + res.status + ')');
  return await res.text();
}

// loadPartial: fetch the partial and REPLACE the placeholder element itself
async function loadPartial(url, placeholderId) {
  const html = await fetchText(url);
  const placeholder = document.getElementById(placeholderId);
  if (!placeholder) {
    // fallback: inject into body top (useful for debug pages)
    document.body.insertAdjacentHTML('afterbegin', html);
    return;
  }
  placeholder.insertAdjacentHTML('afterend', html);
  placeholder.remove();
}

// Main entry: load header, base sidebar, module items, then init bindings
async function loadLayout() {
  // Load header
  await loadPartial(partialsPath + 'header.html', 'header-placeholder');

  // Load sidebar base
  // NOTE: loadPartial removes the placeholder element. If you rely on dataset on the placeholder,
  // prefer setting window.SIDEBAR_MODULE / window.SIDEBAR_ACTIVE_ID before including this script.
  await loadPartial(partialsPath + 'sidebar-base.html', 'sidebar-placeholder');

  // Insert module-specific items into the base
  try {
    await loadModuleSidebar();
  } catch (err) {
    console.warn('Error loading module sidebar:', err);
  }

  // Initialize all bindings (header + sidebar interactions)
  initLayoutBindings();
}

async function loadModuleSidebar() {
  // Determine module name and active id using window globals if set.
  // (Reading dataset from #sidebar-placeholder is unreliable if the placeholder has been removed,
  // so prefer window.SIDEBAR_MODULE or include a tiny inline script on the page that sets it.)
  const placeholder = document.getElementById('sidebar-placeholder'); // may be null if already removed
  const moduleFromAttr = placeholder && placeholder.dataset && placeholder.dataset.module;
  const activeFromAttr = placeholder && placeholder.dataset && placeholder.dataset.active;

  const moduleName = (window.SIDEBAR_MODULE || moduleFromAttr || 'author').trim();
  const activeId = (window.SIDEBAR_ACTIVE_ID || activeFromAttr || '').trim();

  const moduleUrl = partialsPath + 'sidebar-items/' + moduleName + '.html';

  let moduleHtml = '';
  try {
    moduleHtml = await fetchText(moduleUrl);
  } catch (err) {
    console.warn('module sidebar not found for', moduleName, err);
    moduleHtml = '<!-- no sidebar items for ' + moduleName + ' -->';
  }

  const sidebarItems = document.getElementById('sidebarItems');
  if (!sidebarItems) {
    console.warn('No #sidebarItems container found to insert module menu');
    return;
  }

  // Insert module markup (module partials should contain <li> elements)
  sidebarItems.innerHTML = moduleHtml;

  // After injection, set active item (explicit ID or fallback by path)
  setActiveSidebarItem(activeId);
}

// small helper for safe contains checks
function safeContains(el, target) {
  return !!(el && target && typeof el.contains === 'function' && el.contains(target));
}

// Set active item by explicitId or by trying to match current pathname
function setActiveSidebarItem(explicitId) {
  const sidebarItems = document.getElementById('sidebarItems');
  if (!sidebarItems) return;

  // clear existing active classes
  sidebarItems.querySelectorAll('.active').forEach(n => n.classList.remove('active'));

  let activeEl = null;

  if (explicitId) {
    activeEl = sidebarItems.querySelector('[data-id="' + explicitId + '"]');
  }

  if (!activeEl) {
    // fallback: match by current pathname
    const path = window.location.pathname.split('/').pop(); // e.g. page.html
    const candidates = Array.from(sidebarItems.querySelectorAll('a[href]'));
    activeEl = candidates.find(a => {
      const href = a.getAttribute('href');
      if (!href) return false;
      // normalize comparisons
      const hrefLast = href.split('/').pop();
      return href === path || href === './' + path || href === '/' + path || hrefLast === path;
    });
  }

  if (activeEl) {
    // prefer adding .active to the <a> and its closest <li>
    activeEl.classList.add('active');
    const parentLi = activeEl.closest('li');
    if (parentLi) parentLi.classList.add('active');

    // ensure dropdown parents open so active item is visible
    expandParentDropdowns(activeEl);

    try { activeEl.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignore */ }
  }
}

// walk upward and open any parent dropdowns so children are visible
function expandParentDropdowns(el) {
  if (!el) return;
  let p = el.parentElement;
  while (p && p.id !== 'sidebarItems') {
    if (p.classList && p.classList.contains('dropdown-menu')) {
      p.classList.add('show');
      const parentLi = p.closest('li');
      if (parentLi) parentLi.classList.add('dropdown-open');
      const toggleBtn = parentLi && parentLi.querySelector('.dropdown-toggle');
      if (toggleBtn) {
        toggleBtn.classList.add('active');
        toggleBtn.setAttribute('aria-expanded', 'true');
      }
    }
    p = p.parentElement;
  }
}

/* ----------------- initLayoutBindings (header + sidebar) ----------------- */
function initLayoutBindings() {
  // Elements (now in DOM)
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
  // debounced resize handler
  let resizeTimer;
  window.removeEventListener('resize', initLayoutState); // safe remove (no-op if not attached)
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initLayoutState, 120);
  });

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

  // ---------------------- Sidebar dropdowns (module menus) ----------------------
  // Attach click and keyboard handlers to any .dropdown-toggle inside the sidebar.
  const sidebarNav = document.querySelector('.sidebar-nav');
  if (sidebarNav) {
    const sidebarDropdownToggles = sidebarNav.querySelectorAll('.dropdown-toggle');
    sidebarDropdownToggles.forEach(btn => {
      // Ensure button is focusable and has aria-expanded
      if (!btn.hasAttribute('tabindex')) btn.setAttribute('tabindex', '0');
      if (!btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded', 'false');

      btn.addEventListener('click', function (e) {
        const li = btn.closest('li');
        const menu = li && li.querySelector('.dropdown-menu');
        const isOpen = btn.classList.contains('active') || (menu && menu.classList.contains('show')) || (li && li.classList.contains('dropdown-open'));

        if (isOpen) {
          // close this dropdown
          btn.classList.remove('active');
          btn.setAttribute('aria-expanded', 'false');
          li && li.classList.remove('dropdown-open');
          if (menu) menu.classList.remove('show');
        } else {
          // close other open sidebar dropdowns first
          const openLis = sidebarNav.querySelectorAll('li.dropdown-open');
          openLis.forEach(openLi => {
            if (openLi !== li) {
              openLi.classList.remove('dropdown-open');
              const t = openLi.querySelector('.dropdown-toggle'); if (t) { t.classList.remove('active'); t.setAttribute('aria-expanded', 'false'); }
              const m = openLi.querySelector('.dropdown-menu'); if (m) m.classList.remove('show');
            }
          });

          // open this one
          btn.classList.add('active');
          btn.setAttribute('aria-expanded', 'true');
          li && li.classList.add('dropdown-open');
          if (menu) menu.classList.add('show');
        }

        e.stopPropagation();
      });

      // keyboard support (Enter / Space)
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
      });
    });
  }

  // ---------------------- Search behavior & "active submit" state ----------------------
  function runSearch(query) {
    // Replace this with your real search route or function
    console.log('runSearch →', query);
    // For now, a UI feedback placeholder (non-blocking)
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

  // ---------------------- user menu, more menu, notifications etc ----------------------

  // User avatar menu (large screens)
  if (userAvatar) {
    userAvatar.addEventListener('click', function (e) {
      if (isMobile()) return;
      const shown = userDropdown && userDropdown.classList.contains('show');
      hideMoreDropdown();
      hideNotificationBox();

      if (shown) userDropdown.classList.remove('show');
      else userDropdown && userDropdown.classList.add('show');
      e.stopPropagation();
    });
  }

  // user menu actions (large)
  if (userProfileLarge) userProfileLarge.addEventListener('click', e => { userDropdown && userDropdown.classList.remove('show'); alert('Open My Profile (large screen)'); e.preventDefault(); });
  if (userSettingsLarge) userSettingsLarge.addEventListener('click', e => { userDropdown && userDropdown.classList.remove('show'); alert('Open Settings (large screen)'); e.preventDefault(); });
  if (userLogoutLarge) userLogoutLarge.addEventListener('click', e => { userDropdown && userDropdown.classList.remove('show'); alert('Perform logout (large screen)'); e.preventDefault(); });

  // More (three dot) menu (mobile)
  if (moreMenu) {
    moreMenu.addEventListener('click', function (e) {
      const show = moreDropdown && moreDropdown.classList.contains('show');
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
    if (!avatarEl || !safeContains(avatarEl, e.target)) {
      if (userDropdown) userDropdown.classList.remove('show');
    }

    if (!moreMenu || !safeContains(moreMenu, e.target)) hideMoreDropdown();

    if (!notificationBox || (!safeContains(notificationBox, e.target) && !safeContains(notificationIcon, e.target))) hideNotificationBox();

    if (!documentDropdownBtn || (!safeContains(documentDropdownBtn, e.target) && !(documentMenu && safeContains(documentMenu, e.target)))) {
      if (documentDropdownBtn) documentDropdownBtn.classList.remove('active');
      if (documentMenu) documentMenu.classList.remove('show');
      if (documentDropdownLi) documentDropdownLi.classList.remove('dropdown-open');
    }

    // close sidebar dropdowns if clicking outside the sidebar nav
    const sidebarNavEl = document.querySelector('.sidebar-nav');
    if (!sidebarNavEl || !safeContains(sidebarNavEl, e.target)) {
      const openSidebarLis = document.querySelectorAll('.sidebar-nav li.dropdown-open');
      openSidebarLis.forEach(openLi => {
        openLi.classList.remove('dropdown-open');
        const t = openLi.querySelector('.dropdown-toggle'); if (t) { t.classList.remove('active'); t.setAttribute('aria-expanded', 'false'); }
        const m = openLi.querySelector('.dropdown-menu'); if (m) m.classList.remove('show');
      });
    }
  });

  // Sidebar links close overlay on mobile
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.addEventListener('click', function () {
      if (isMobile() && sidebar && toggleSidebar) {
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

      // also close open sidebar dropdowns
      const openSidebarLis = document.querySelectorAll('.sidebar-nav li.dropdown-open');
      openSidebarLis.forEach(openLi => {
        openLi.classList.remove('dropdown-open');
        const t = openLi.querySelector('.dropdown-toggle'); if (t) { t.classList.remove('active'); t.setAttribute('aria-expanded', 'false'); }
        const m = openLi.querySelector('.dropdown-menu'); if (m) m.classList.remove('show');
      });
    }
  });

  // done
}

// kick it off
loadLayout().catch(err => console.error('Error loading layout:', err));
