import { getCookie, setCookie } from 'cookies-next';

const SITES_COOKIE = 'sites';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Get sites from cookie: [{ sitecode, accesscode }, ...]
 */
export function getSites() {
  const raw = getCookie(SITES_COOKIE);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Get list of site codes the user has access to (for home page list)
 */
export function getValidatedCodes() {
  return getSites().map((s) => s.sitecode);
}

/**
 * Get access code for a site from the sites cookie
 */
export function getAccessCodeForSite(code) {
  const entry = getSites().find((e) => e.sitecode === code);
  return entry ? entry.accesscode : null;
}

/**
 * Add or update a site in the sites cookie
 */
export function addOrUpdateSite(sitecode, accesscode) {
  const sites = getSites();
  const idx = sites.findIndex((e) => e.sitecode === sitecode);
  if (idx >= 0) sites[idx].accesscode = accesscode;
  else sites.push({ sitecode, accesscode });
  setCookie(SITES_COOKIE, JSON.stringify(sites), {
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Remove a site from the sites cookie
 */
export function removeSite(sitecode) {
  const sites = getSites().filter((e) => e.sitecode !== sitecode);
  setCookie(SITES_COOKIE, JSON.stringify(sites), {
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}
