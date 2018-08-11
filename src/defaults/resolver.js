import to from '../utils/to';

// default resolver
export default async function resolver(url, fetchOptions) {
  const [err, res] = await to(fetch(url, fetchOptions));
  if (err) {
    throw new Error('Accio error: ' + err.message);
  }
  if (res.ok === false) {
    throw new Error(
      `Accio failed to fetch: ${res.url} ${res.status} (${res.statusText})`
    );
  }
  const [err2, jsonResponse] = await to(res.json());
  if (err2) {
    throw new Error('Error parsing response to json: ' + err2.message);
  }
  return jsonResponse;
}
