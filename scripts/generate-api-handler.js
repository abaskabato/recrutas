import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiHandlerContent = `import { configureApp } from '../server/index.js';

let appInstance = null;
let initPromise = null;

// Initialize the app once (module-level initialization)
const getApp = async () => {
  if (appInstance) {
    return appInstance;
  }
  
  if (!initPromise) {
    initPromise = configureApp().then(app => {
      appInstance = app;
      return app;
    });
  }
  
  return initPromise;
};

// Export handler for Vercel - @vercel/node can handle Express apps
// We'll initialize it on first request
async function handler(req, res) {
  const app = await getApp();
  // Express app is callable, so we can call it directly
  app(req, res);
}

// Export both default and named for compatibility
export default handler;
export { handler };
`;

const apiDir = path.join(__dirname, '..', 'api');
const apiFile = path.join(apiDir, 'index.js');

// Ensure api directory exists
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

// Write the file
fs.writeFileSync(apiFile, apiHandlerContent, 'utf8');
console.log('Generated api/index.js successfully');
