import to from '../utils/to';

// default resolver
export default async function resolver(url, data) {
  const [err, res] = await to(
    Futch(url, {
      body: JSON.stringify(data),
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
    })
  );
  if (err) {
    throw new Error('Futch error: ' + err.message);
  }
  const [err2, jsonResponse] = await to(res.json());
  if (err2) {
    throw new Error('Error parsing response to json: ' + err2.message);
  }
  return jsonResponse;
}
