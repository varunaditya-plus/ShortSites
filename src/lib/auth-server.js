export function getAccessCodeFromSitesCookie(cookieStore, code) {
  const raw = cookieStore.get('sites')?.value;
  if (!raw) return null;
  try {
    const sites = JSON.parse(raw);
    const entry = Array.isArray(sites) && sites.find((e) => e.sitecode === code);
    return entry && entry.accesscode ? entry.accesscode : null;
  } catch {
    return null;
  }
}

export function mergeSitesCookie(cookieStore, sitecode, accesscode) {
  const raw = cookieStore.get('sites')?.value;
  let sites = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      sites = Array.isArray(parsed) ? parsed : [];
    } catch {
      sites = [];
    }
  }
  const idx = sites.findIndex((e) => e.sitecode === sitecode);
  if (idx >= 0) sites[idx].accesscode = accesscode;
  else sites.push({ sitecode, accesscode });
  return sites;
}
