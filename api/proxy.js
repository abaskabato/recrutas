import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { method, headers, body, url } = req;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  const path = url.replace('/api/proxy', '');
  const targetUrl = `${supabaseUrl}${path}`;

  try {
    const response = await fetch(targetUrl, {
      method,
      headers: {
        ...headers,
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : null,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy error' });
  }
}
