import express from "express";
import path from "path";
import fs from "fs";

// Production-safe logging function without Vite dependencies
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Production static file serving without Vite
export function serveStatic(app: express.Express) {
  const distPath = path.resolve(process.cwd(), "dist");
  
  if (fs.existsSync(distPath)) {
    // Serve static files from dist directory
    app.use(express.static(distPath));
    
    // Catch-all handler for client-side routing
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application not found");
      }
    });
  } else {
    // Fallback when dist directory doesn't exist
    app.get("*", (req, res) => {
      res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recrutas - AI-Powered Job Platform</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; 
              margin: 0; 
              padding: 50px 20px; 
              text-align: center; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .container {
              max-width: 600px;
              background: rgba(255, 255, 255, 0.1);
              padding: 40px;
              border-radius: 20px;
              backdrop-filter: blur(10px);
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }
            .logo {
              font-size: 2.5rem;
              font-weight: bold;
              margin-bottom: 20px;
              text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            }
            .tagline {
              font-size: 1.2rem;
              margin-bottom: 30px;
              opacity: 0.9;
            }
            .loader {
              margin: 30px auto;
              width: 50px;
              height: 50px;
              border: 4px solid rgba(255, 255, 255, 0.3);
              border-top: 4px solid white;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .status {
              font-size: 1rem;
              opacity: 0.8;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">Recrutas</div>
            <div class="tagline">Built on AI. Backed by transparency. Focused on you.</div>
            <div class="loader"></div>
            <div class="status">Application is starting up...</div>
          </div>
        </body>
        </html>
      `);
    });
  }
}

// Stub for setupVite in production - does nothing
export async function setupVite(app: express.Express, server: any) {
  // No-op in production
  log("Vite setup skipped in production mode");
}