// API to fetch pending reviewers (users with role=reviewer and isVerified=false)
async function fetchPendingReviewers() {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}api/v1/user?role=reviewer&verified=false`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    // ... handle response
}

// Verify reviewer
async function verifyReviewer(userId) {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}api/v1/user/${userId}/verifytoggle`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    // ... handle response
}