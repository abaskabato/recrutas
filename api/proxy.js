import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { method, headers, body, url } = req;

  console.log(`[PROXY] Request: ${method} ${url}`);

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  const path = url.replace('/api/proxy', '');
  const targetUrl = `${supabaseUrl}${path}`;

  console.log(`[PROXY] Target URL: ${targetUrl}`);

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

    const responseText = await response.text();
    console.log(`[PROXY] Response from Supabase: ${responseText}`);

    try {
      const data = JSON.parse(responseText);
      res.status(response.status).json(data);
    } catch (error) {
      console.error('[PROXY] JSON parse error:', error);
      res.status(500).send(responseText);
    }
  } catch (error) {
    console.error('[PROXY] Fetch error:', error);
    res.status(500).json({ error: 'Proxy error' });
  }
}
