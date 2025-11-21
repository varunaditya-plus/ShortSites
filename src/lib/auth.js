import { getCookie, setCookie, deleteCookie } from 'cookies-next';

const VALIDATED_CODES_KEY = 'validated_codes';
const EDIT_AUTH_PREFIX = 'edit_auth_';

/**
 * Get validated site codes from cookies
 */
export function getValidatedCodes() {
  const codes = getCookie(VALIDATED_CODES_KEY);
  if (!codes) return [];
  try {
    return JSON.parse(codes);
  } catch {
    return [];
  }
}

/**
 * Add a validated code to the list
 */
export function addValidatedCode(code) {
  const codes = getValidatedCodes();
  if (!codes.includes(code)) {
    codes.push(code);
    setCookie(VALIDATED_CODES_KEY, JSON.stringify(codes), {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });
  }
}

/**
 * Check if user is authorized to edit a site
 */
export function isAuthorizedToEdit(code) {
  return getCookie(`${EDIT_AUTH_PREFIX}${code}`) === 'true';
}

/**
 * Set authorization for editing a site
 */
export function setEditAuth(code, authorized = true) {
  setCookie(`${EDIT_AUTH_PREFIX}${code}`, authorized ? 'true' : 'false', {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });
}

/**
 * Clear authorization for editing a site
 */
export function clearEditAuth(code) {
  deleteCookie(`${EDIT_AUTH_PREFIX}${code}`, { path: '/' });
}

