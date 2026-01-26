// Theme Toggle
function toggleTheme() {
  const html = document.documentElement
  const currentTheme = html.getAttribute("data-theme")
  const newTheme = currentTheme === "dark" ? "light" : "dark"

  html.setAttribute("data-theme", newTheme)
  localStorage.setItem("theme", newTheme)

  updateThemeIcon(newTheme)
}

function updateThemeIcon(theme) {
  const sunIcon = document.querySelector(".sun-icon")
  const moonIcon = document.querySelector(".moon-icon")

  if (sunIcon && moonIcon) {
    if (theme === "dark") {
      sunIcon.style.display = "none"
      moonIcon.style.display = "block"
    } else {
      sunIcon.style.display = "block"
      moonIcon.style.display = "none"
    }
  }
}

// Initialize theme
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light"
  document.documentElement.setAttribute("data-theme", savedTheme)
  updateThemeIcon(savedTheme)
}

// Mobile Menu Toggle
function toggleMobileMenu() {
  const mobileMenu = document.getElementById("mobileMenu")
  mobileMenu.classList.toggle("active")
}

// Scroll Animations
function handleScrollAnimations() {
  const elements = document.querySelectorAll(".animate-on-scroll")

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible")
        }
      })
    },
    {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    },
  )

  elements.forEach((element) => {
    observer.observe(element)
  })
}

// Navbar scroll effect
function handleNavbarScroll() {
  const navbar = document.querySelector(".navbar")

  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.style.background = "var(--background)"
      navbar.style.boxShadow = "0 2px 20px rgba(0, 0, 0, 0.1)"
    } else {
      navbar.style.background = "var(--background)"
      navbar.style.boxShadow = "none"
    }
  })
}

// Smooth scroll for anchor links
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault()
      const target = document.querySelector(this.getAttribute("href"))
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }
    })
  })
}

// Guidelines page tab navigation
function initGuidelineTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn")

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-target")
      const targetSection = document.getElementById(targetId)

      // Remove active class from all buttons
      tabButtons.forEach((btn) => btn.classList.remove("active"))
      button.classList.add("active")

      // Scroll to section
      if (targetSection) {
        const navHeight = document.querySelector(".navbar").offsetHeight
        const tabsHeight = document.querySelector(".guidelines-nav")?.offsetHeight || 0
        const offset = navHeight + tabsHeight + 20

        window.scrollTo({
          top: targetSection.offsetTop - offset,
          behavior: "smooth",
        })
      }
    })
  })
}

// Issues page filter functionality
function initIssuesFilter() {
  const filterForm = document.querySelector(".filter-container")
  if (!filterForm) return

  const applyBtn = filterForm.querySelector(".btn-primary")
  const clearBtn = filterForm.querySelector(".btn-outline")

  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      // In a real app, this would filter the issues
      console.log("Applying filters...")
    })
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const inputs = filterForm.querySelectorAll("input, select")
      inputs.forEach((input) => {
        if (input.type === "text" || input.type === "search") {
          input.value = ""
        } else if (input.tagName === "SELECT") {
          input.selectedIndex = 0
        }
      })
    })
  }
}

// Pagination functionality
function initPagination() {
  const pageButtons = document.querySelectorAll(".page-btn")

  pageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      pageButtons.forEach((btn) => btn.classList.remove("active"))
      button.classList.add("active")

      // In a real app, this would load the corresponding page
      console.log("Loading page:", button.textContent)
    })
  })
}

// Counter animation for stats
function animateCounters() {
  const counters = document.querySelectorAll(".stat-item h3")

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target
          const text = target.textContent
          const number = Number.parseInt(text.replace(/\D/g, ""))
          const suffix = text.replace(/[0-9]/g, "")

          let current = 0
          const increment = number / 50
          const duration = 2000
          const stepTime = duration / 50

          const timer = setInterval(() => {
            current += increment
            if (current >= number) {
              target.textContent = number + suffix
              clearInterval(timer)
            } else {
              target.textContent = Math.floor(current) + suffix
            }
          }, stepTime)

          observer.unobserve(target)
        }
      })
    },
    { threshold: 0.5 },
  )

  counters.forEach((counter) => observer.observe(counter))
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initTheme()
  handleScrollAnimations()
  handleNavbarScroll()
  initSmoothScroll()
  initGuidelineTabs()
  initIssuesFilter()
  initPagination()
  animateCounters()
})

// Close mobile menu when clicking outside
document.addEventListener("click", (e) => {
  const mobileMenu = document.getElementById("mobileMenu")
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn")

  if (mobileMenu && !mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
    mobileMenu.classList.remove("active")
  }
})


// Register Dropdown Toggle
function toggleRegisterDropdown() {
  const dropdown = document.getElementById('registerDropdown');
  dropdown.classList.toggle('active');
  
  // Close other dropdowns
  const mobileDropdown = document.getElementById('mobileRegisterDropdown');
  if (mobileDropdown) {
    mobileDropdown.classList.remove('active');
    const toggleBtn = mobileDropdown.previousElementSibling;
    if (toggleBtn) toggleBtn.classList.remove('active');
  }
}

// Mobile Register Dropdown Toggle
function toggleMobileRegisterDropdown() {
  const dropdown = document.getElementById('mobileRegisterDropdown');
  const toggleBtn = event.currentTarget;
  
  dropdown.classList.toggle('active');
  toggleBtn.classList.toggle('active');
  
  // Close desktop dropdown
  const desktopDropdown = document.getElementById('registerDropdown');
  if (desktopDropdown) {
    desktopDropdown.classList.remove('active');
  }
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('registerDropdown');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  
  // Close desktop dropdown if clicking outside
  if (dropdown && !dropdown.contains(e.target)) {
    dropdown.classList.remove('active');
  }
  
  // Close mobile menu if clicking outside
  if (mobileMenu && mobileMenuBtn && !mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
    mobileMenu.classList.remove('active');
  }
});
