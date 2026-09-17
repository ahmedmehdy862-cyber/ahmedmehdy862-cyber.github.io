const siteConfigCache = { data: null, promise: null };

export async function getSiteConfig() {
  if (siteConfigCache.promise) return siteConfigCache.promise;
  siteConfigCache.promise = fetch(`${import.meta.env.BASE_URL}site.json`)
    .then((res) => {
      if (!res.ok) throw new Error('Failed to load site config');
      return res.json();
    })
    .then((data) => {
      siteConfigCache.data = data;
      return data;
    })
    .catch((err) => {
      siteConfigCache.promise = null;
      console.error('Error loading site config:', err);
      return siteConfigCache.data || {};
    });
  return siteConfigCache.promise;
}