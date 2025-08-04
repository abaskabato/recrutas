import express from 'express';
import { createServer } from 'vite';

async function createViteServer() {
  const app = express();
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  app.use(vite.middlewares);

  app.use('*_handler', async (req, res) => {
    try {
      const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
      const html = await render(req.originalUrl);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      console.error(e);
      res.status(500).end(e.message);
    }
  });

  return { app, vite };
}

createViteServer().then(({ app }) => {
  app.listen(5173, () => {
    console.log('http://localhost:5173');
  });
});