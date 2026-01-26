const BASE_URL = "https://jms.247laboratory.net";
const token = localStorage.getItem("token");

function redirectToLogin() {
  window.location.href = "/login.html"; // Redirect to your login page
}

async function verifyToken() {
  // If no token, redirect to login immediately
  if (!token) {
    redirectToLogin();
    return;
  }

  // Show spinner while verifying token
  // showLoadingSpinner();

  try {
    //alert("verifying token", token);
    const response = await fetch(`${BASE_URL}/auth/verify`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // If the token is invalid or expired, it will throw an error
    if (!response.ok) {
      throw new Error("Token is invalid or expired");
    }

    // Handle server response (optional)
    const data = await response.json();

    console.log("User data:", data);

    // You can add any other logic here to handle the user data if needed
  } catch (error) {
    console.error(error.message);
    toastr.error(error.message);
    // Remove the invalid token and redirect to login
    localStorage.removeItem("token");
    redirectToLogin();
  }
}

function logout() {
  // Remove token from localStorage and redirect to login page
  alert("are you loggin out?");
  localStorage.removeItem("token");
  window.location.href = "/login.html"; // Redirect to login page
}


verifyToken(); // Call the function to verify the token when the script runs
