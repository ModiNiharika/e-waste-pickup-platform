// 1. Get references to our HTML elements so we can control them
const form = document.getElementById('pickup-form');
const formSection = document.getElementById('form-section');
const successSection = document.getElementById('success-section');
const errorMessage = document.getElementById('error-message');
const submitBtn = document.getElementById('submit-btn');
const resetBtn = document.getElementById('reset-btn');

// The URL of our Python FastAPI server
const API_URL = 'https://e-waste-pickup-platform-j428.onrender.com/api/requests';

// 2. Listen for the moment the user clicks "Request Pickup"
form.addEventListener('submit', async function (event) {

    // Prevent page refresh
    event.preventDefault();

    // Hide old errors
    errorMessage.classList.add('hidden');

    // Loading state
    submitBtn.textContent = 'Scheduling...';
    submitBtn.disabled = true;

    // 3. Collect form data
    const requestData = {
        full_name: document.getElementById('fullName').value,
        phone_number: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        category: document.getElementById('category').value,
        estimated_quantity: parseInt(document.getElementById('quantity').value)
    };

    try {

        // 4. Send request to backend
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        // Handle validation/server errors
        if (!response.ok) {

            const errorData = await response.json();

            // FastAPI validation errors
            if (errorData.detail && Array.isArray(errorData.detail)) {

                // Pass backend error to translator
                const friendlyMessage =
                    getFriendlyErrorMessage(errorData.detail[0]);

                throw new Error(friendlyMessage);

            } else {

                throw new Error('Server rejected the request.');
            }
        }

        // 5. Success response
        const responseData = await response.json();

        // Hide form
        formSection.classList.add('hidden');

        // Show success section
        successSection.classList.remove('hidden');

        // Update success details
        document.getElementById('req-id').textContent = responseData.id;

        document.getElementById('reward-points').textContent =
            responseData.estimated_points;

    } catch (error) {

        console.error('Error:', error);

        // Server offline / network error
        if (error.message === 'Failed to fetch') {

            errorMessage.textContent =
                'Cannot connect to server. Please try again later.';

        } else {

            // Show validation error
            errorMessage.textContent = error.message;
        }

        // Show error message
        errorMessage.classList.remove('hidden');

    } finally {

        // Reset button state
        submitBtn.textContent = 'Request Pickup';
        submitBtn.disabled = false;
    }
});

// 7. Logic for the "Schedule Another" button
resetBtn.addEventListener('click', function () {

    // Clear form
    form.reset();

    // Hide success section
    successSection.classList.add('hidden');

    // Show form again
    formSection.classList.remove('hidden');
});

// --- NEW HELPER FUNCTION ---
// This translates technical backend errors into friendly human errors

function getFriendlyErrorMessage(errorDetail) {

    // errorDetail.loc usually looks like ["body", "phone_number"]
    const fieldName = errorDetail.loc[errorDetail.loc.length - 1];

    if (fieldName === 'phone_number') {
        return "Please enter a valid phone number with at least 10 digits.";
    }

    if (fieldName === 'estimated_quantity') {
        return "The quantity must be at least 1.";
    }

    if (fieldName === 'full_name') {
        return "Please make sure you entered your full name.";
    }

    // Fallback message
    return "Please check your information and try again.";
}