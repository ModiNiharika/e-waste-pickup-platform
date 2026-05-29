// ─── Pre-fill from saved login ────────────────────────────────────────────────
// Returns a YYYY-MM-DD string in the user's local timezone
function localDateStr(date) {
    const d = date || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

document.addEventListener('DOMContentLoaded', () => {
    // Default and minimum date = tomorrow (real pickups need at least 1 day lead time)
    const dateInput = document.getElementById('preferred-date');
    if (dateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = localDateStr(tomorrow);
        dateInput.min   = tomorrowStr;
        dateInput.value = tomorrowStr;
    }

    // Live phone sanitizer — strip any non-digit character as the user types
    const phoneEl = document.getElementById('phone');
    if (phoneEl) {
        phoneEl.addEventListener('input', () => {
            const cleaned = phoneEl.value.replace(/\D/g, '');
            if (phoneEl.value !== cleaned) phoneEl.value = cleaned;
        });
    }

    // Pre-fill and show context when user is logged in
    const user = typeof getUser === 'function' ? getUser() : null;
    if (user) {
        const nameEl2  = document.getElementById('fullName');
        const phoneEl2 = document.getElementById('phone');
        // Strip non-digits from stored phone in case it was saved with formatting
        if (nameEl2  && !nameEl2.value)  nameEl2.value  = user.full_name;
        if (phoneEl2 && !phoneEl2.value) phoneEl2.value = (user.phone_number || '').replace(/\D/g, '');

        // Show the "scheduling as" context strip
        const strip     = document.getElementById('schedule-as-strip');
        const stripName = document.getElementById('schedule-as-name');
        if (strip && stripName) {
            stripName.textContent = user.full_name || user.phone_number;
            strip.classList.remove('hidden');
        }
    }
});

// 1. Get references to our HTML elements so we can control them
const form = document.getElementById('pickup-form');
const formSection = document.getElementById('form-section');
const successSection = document.getElementById('success-section');
const errorMessage = document.getElementById('error-message');
const submitBtn = document.getElementById('submit-btn');
const resetBtn = document.getElementById('reset-btn');

// API_BASE is defined globally in auth.js (loaded before this script).
const API_URL = `${API_BASE}/api/requests`;

// 2. Listen for the moment the user clicks "Request Pickup"
form.addEventListener('submit', async function (event) {

    // Prevent page refresh
    event.preventDefault();

    // Hide old errors
    errorMessage.classList.add('hidden');
    const dateErrorEl  = document.getElementById('date-error');
    const phoneErrorEl = document.getElementById('phone-error');
    if (dateErrorEl)  dateErrorEl.classList.add('hidden');
    if (phoneErrorEl) phoneErrorEl.classList.add('hidden');

    // Validate phone: must be exactly 10 digits
    const rawPhone = document.getElementById('phone').value.replace(/\D/g, '');
    if (rawPhone.length < 10) {
        if (phoneErrorEl) {
            phoneErrorEl.textContent = 'Please enter a valid 10-digit phone number.';
            phoneErrorEl.classList.remove('hidden');
        }
        document.getElementById('phone').focus();
        return;
    }

    // Validate preferred date: must be at least tomorrow
    let prefDateVal = document.getElementById('preferred-date')?.value || '';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = localDateStr(tomorrow);
    if (!prefDateVal) {
        // Mobile browsers (iOS Safari, older Android) sometimes lose a
        // programmatically-set date value between DOMContentLoaded and submit.
        // Fall back to tomorrow, which matches the pre-filled field default.
        prefDateVal = tomorrowStr;
        const dateEl = document.getElementById('preferred-date');
        if (dateEl) dateEl.value = prefDateVal;
    } else if (prefDateVal < tomorrowStr) {
        if (dateErrorEl) {
            dateErrorEl.textContent = 'Pickup must be scheduled at least 1 day in advance.';
            dateErrorEl.classList.remove('hidden');
        }
        return;
    }

    // Loading state
    submitBtn.textContent = 'Scheduling...';
    submitBtn.disabled = true;

    // 3. Collect form data — phone is always sent as clean digits regardless of autofill formatting
    const requestData = {
        full_name: document.getElementById('fullName').value.trim(),
        phone_number: rawPhone,
        address: document.getElementById('address').value,
        category: document.getElementById('category').value,
        estimated_quantity: parseInt(document.getElementById('quantity').value),
        preferred_date: prefDateVal,
        time_slot: document.getElementById('time-slot')?.value || 'Morning',
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
        document.getElementById('reward-points').textContent = responseData.estimated_points;

        // Persist booking details as a fallback for pre-migration requests in admin modal
        localStorage.setItem(`eco_booking_${responseData.id}`, JSON.stringify({
            preferred_date:     requestData.preferred_date      || null,
            time_slot:          requestData.time_slot           || null,
            full_name:          requestData.full_name           || null,
            phone_number:       requestData.phone_number        || null,
            estimated_quantity: requestData.estimated_quantity  || null,
        }));

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

    // Re-set date minimum/default to tomorrow after reset clears it
    const dateInput = document.getElementById('preferred-date');
    if (dateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = localDateStr(tomorrow);
        dateInput.min   = tomorrowStr;
        dateInput.value = tomorrowStr;
    }

    // Re-fill name/phone from session after reset clears them
    const user = typeof getUser === 'function' ? getUser() : null;
    if (user) {
        const nameEl  = document.getElementById('fullName');
        const phoneEl = document.getElementById('phone');
        if (nameEl)  nameEl.value  = user.full_name;
        if (phoneEl) phoneEl.value = (user.phone_number || '').replace(/\D/g, '');
    }
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