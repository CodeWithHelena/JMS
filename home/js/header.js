const header = document.getElementById('header');

header.innerHTML = `
    <div class="container">
            <nav class="navbar">
                <div class="logo">
                   <img src="../assets/img/logo.png" alt="" width="70px">
                    <span>FedponekIJRD</span>
                </div>
                
                <div class="nav-links">
                    <a href="index.html">Home</a>
                    <a href="journal.html">Journals</a>
                    <a href="issues.html">Issues</a>
                    <a href="about-us.html">About</a>
                    <a href="guideline.html">Guideline</a>
                    <div class="auth-buttons">
                        <a href="../login.html" class="btn-signin" style="background: #1F1B51 !important; color: white"; padding="10px 20px !important">
                            <i class="fas fa-sign-in-alt" ></i> Sign In
                        </a>
                        <a href="../register.html" class="btn-register">
                            <i class="fas fa-user-plus"></i> Register
                        </a>
                    </div>
                </div>
                
                <button class="mobile-menu-btn" id="mobileMenuBtn">
                    <i class="fas fa-bars"></i>
                </button>
            </nav>
        </div>

`
