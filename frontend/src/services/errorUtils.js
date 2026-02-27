/**
 * Converts any Axios error into a short, friendly message safe for end users.
 * Raw database errors, SQL traces, and technical stack details are NEVER exposed.
 *
 * @param {Error}  err      - Axios / fetch error
 * @param {string} fallback - Message shown when nothing better is available
 * @returns {string}
 */

// Messages keyed by HTTP status code
const STATUS_MESSAGES = {
    400: "Please check your input and try again.",
    401: "Your session has expired. Please sign in again.",
    403: "You don't have permission to do that.",
    404: "We couldn't find what you were looking for.",
    409: "This already exists — please try a different value.",
    413: "The file you're uploading is too large.",
    422: "Please check your input — something looks incorrect.",
    429: "Too many requests. Please wait a moment and try again.",
    500: "Something went wrong on our end. Please try again shortly.",
    502: "Service is temporarily unavailable. Please try again.",
    503: "Service is temporarily unavailable. Please try again.",
};

// Safe-list: short backend messages that are user-friendly enough to show directly.
// Any message containing these patterns is blocked as technical.
const TECH_PATTERNS = [
    /sqlite/i, /sqlalchemy/i, /sql:/i, /operationalerror/i,
    /traceback/i, /exception/i, /column/i, /table/i,
    /select\s/i, /insert\s/i, /update\s/i, /delete\s/i,
    /\[sql\]/i, /parameters\s*:/i, /https?:\/\//,
    /\bat\s+line\b/i, /stacktrace/i, /pydantic/i,
];

function isTechnical(msg) {
    if (!msg || typeof msg !== "string") return true;
    if (msg.length > 180) return true;  // long messages are almost always stack traces
    return TECH_PATTERNS.some(p => p.test(msg));
}

export function getErrorMessage(err, fallback = "Something went wrong. Please try again.") {
    // Network / no-response errors
    if (!err?.response) {
        if (err?.message === "Network Error") return "Unable to connect. Please check your internet connection.";
        return fallback;
    }

    const status = err.response?.status;
    const detail = err.response?.data?.detail;

    // 1. If we have a known-safe string from the backend, use it
    if (detail && typeof detail === "string" && !isTechnical(detail)) {
        return detail;
    }

    // 2. Pydantic validation array — extract field names only
    if (Array.isArray(detail)) {
        const fields = detail
            .map(d => {
                const loc = d.loc?.slice(1).join(" → ") || "";
                const clean = d.msg?.replace(/^value error,?\s*/i, "") || "";
                return loc ? `${loc}: ${clean}` : clean;
            })
            .filter(Boolean)
            .slice(0, 3); // cap at 3 field errors
        if (fields.length) return fields.join(" · ");
    }

    // 3. Map HTTP status → friendly message
    if (STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];

    // 4. Last resort
    return fallback;
}
