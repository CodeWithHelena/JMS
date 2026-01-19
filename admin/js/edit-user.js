// Edit User Modal Functionality
import { BASE_URL, token } from '/assets/js/utility.js';

document.addEventListener('DOMContentLoaded', function () {
    console.log('Edit user script loaded');

    // Modal elements
    const editUserModal = document.getElementById('editUserModal');
    const editUserForm = document.getElementById('editUserForm');
    const modalCloseBtn = document.querySelector('.modal-close');
    const modalCancelBtn = document.querySelector('.modal-cancel');

    // Form fields
    const editFirstName = document.getElementById('editFirstName');
    const editLastName = document.getElementById('editLastName');
    const editPhone = document.getElementById('editPhone');
    const editAddress = document.getElementById('editAddress');
    const editGender = document.getElementById('editGender');
    const editAffiliation = document.getElementById('editAffiliation');
    const editUserId = document.getElementById('editUserId');

    // Error elements
    const firstNameError = document.getElementById('firstNameError');
    const lastNameError = document.getElementById('lastNameError');
    const addressError = document.getElementById('addressError');

    let currentUser = null;

    /* =========================
        Utility functions
    ========================== */

    function clearErrors() {
        [editFirstName, editLastName, editAddress].forEach(el => {
            el.classList.remove('error');
        });

        [firstNameError, lastNameError, addressError].forEach(err => {
            err.textContent = '';
            err.style.display = 'none';
        });
    }

    function showError(input, message) {
        input.classList.add('error');
        const errorEl = document.getElementById(`${input.name}Error`);
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }

    function closeModal() {
        editUserModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        clearErrors();
    }

    function openModal() {
        editUserModal.classList.add('active');
        document.body.classList.add('modal-open');
    }

    /* =========================
        Open Edit Modal (GLOBAL)
    ========================== */

    window.openEditModal = function (user) {
        if (!user) return;

        currentUser = user;

        editFirstName.value = user.firstName || '';
        editLastName.value = user.lastName || '';
        editPhone.value = user.phone || '';
        editAddress.value = user.address || '';
        editGender.value = user.gender || '';
        editAffiliation.value = user.affiliation || '';
        editUserId.value = user._id;

        clearErrors();
        openModal();
    };

    /* =========================
        Close Modal Events
    ========================== */

    modalCloseBtn.addEventListener('click', closeModal);
    modalCancelBtn.addEventListener('click', closeModal);

    editUserModal.addEventListener('click', function (e) {
        if (e.target === editUserModal) {
            closeModal();
        }
    });

    /* =========================
        Submit Edit Form
    ========================== */

    editUserForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearErrors();

        if (!token) {
            toastr.error('Authentication required. Please login again.');
            return;
        }

        // Basic validation (NO phone validation)
        if (!editFirstName.value.trim()) {
            showError(editFirstName, 'First name is required');
            return;
        }

        if (!editLastName.value.trim()) {
            showError(editLastName, 'Last name is required');
            return;
        }

        if (!editAddress.value.trim()) {
            showError(editAddress, 'Address is required');
            return;
        }

        const userId = editUserId.value;

        const payload = {
            firstName: editFirstName.value.trim(),
            lastName: editLastName.value.trim(),
            phone: editPhone.value.trim(),
            address: editAddress.value.trim(),
            gender: editGender.value || null,
            affiliation: editAffiliation.value.trim()
        };

        try {
            Swal.fire({
                title: 'Updating User...',
                text: 'Please wait',
                allowOutsideClick: false,
                showConfirmButton: false,
                willOpen: () => Swal.showLoading()
            });

            const response = await fetch(`${BASE_URL}/user/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            let data = null;
            if (response.headers.get('content-type')?.includes('application/json')) {
                data = await response.json();
            }

            if (!response.ok) {
                throw new Error(data?.message || 'Failed to update user');
            }

            Swal.close();
            toastr.success('User updated successfully');

            // Update current user object
            Object.assign(currentUser, payload);

            // Re-render user details WITHOUT page refresh
            if (typeof renderUserDetails === 'function') {
                document.getElementById('userDetails').innerHTML =
                    renderUserDetails(currentUser);
                setupEventListeners(currentUser);
            }

            closeModal();

        } catch (error) {
            Swal.close();
            console.error('Error updating user:', error);
            toastr.error(error.message || 'Error updating user');
        }
    });
});
