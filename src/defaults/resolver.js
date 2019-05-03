import to from '../utils/to';

// default resolver
export default function resolver(url, fetchOptions) {
  return to(fetch(url, fetchOptions))
    .then(([err, res]) => {
      if (err) {
        throw new Error('Accio error: ' + err.message);
      }
      if (res.ok === false) {
        throw new Error(
          `Accio failed to fetch: ${res.url} ${res.status} (${res.statusText})`
        );
      }
      return to(res.json());
    })
    .then(([err2, jsonResponse]) => {
      if (err2) {
        throw new Error('Error parsing response to json: ' + err2.message);
      }
      return jsonResponse;
    });
}
