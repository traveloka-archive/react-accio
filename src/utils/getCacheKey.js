export default function getCacheKey(url, fetchOptions) {
  let cacheKey = url;
  if (fetchOptions.body) {
    cacheKey = cacheKey + JSON.stringify(fetchOptions.body);
  }
  return cacheKey;
}
