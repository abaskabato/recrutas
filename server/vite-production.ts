import express, { type Express } from "express";
import fs from "fs";
import path from "path";

/**
 * Production-safe Vite utilities
 * This file provides the same interface as server/vite.ts but without Vite imports
 * Prevents esbuild bundling conflicts during deployment
 */

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Production version that doesn't use Vite - only serves static files
export async function setupVite(app: Express, server: any) {
  // In production, we don't set up Vite dev server, just use static serving
  console.warn("setupVite called in production - falling back to static serving");
  serveStatic(app);
}

export function serveStatic(app: Express) {
  // Look for build output in various possible locations
  const possiblePaths = [
    path.resolve(import.meta.dirname, "public"),     // Built with this script
    path.resolve(import.meta.dirname, "..", "public"), // Standard Vite output
    path.resolve(import.meta.dirname, "..", "dist", "public"), // Alternative location
    path.resolve(process.cwd(), "public"),           // Current working directory
    path.resolve(process.cwd(), "dist", "public")    // Dist folder
  ];

  let distPath: string | null = null;
  
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath) && fs.existsSync(path.join(testPath, "index.html"))) {
      distPath = testPath;
      break;
    }
  }

  if (!distPath) {
    // Create a basic fallback HTML if no build found
    const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recrutas</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .container { max-width: 600px; margin: 0 auto; }
        .error { color: #e74c3c; margin: 20px 0; }
        .instructions { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Recrutas</h1>
        <div class="error">
            <p>Frontend build not found. Please build the application first.</p>
        </div>
        <div class="instructions">
            <h3>To fix this:</h3>
            <ol>
                <li>Run: <code>vite build</code></li>
                <li>Or run: <code>node build-production-fixed.js</code></li>
                <li>Restart the server</li>
            </ol>
        </div>
        <p>API endpoints are still available at <a href="/api">/api</a></p>
    </div>
</body>
</html>`;

    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) return; // Let API routes handle themselves
      res.status(503).send(fallbackHtml);
    });
    
    log("Frontend build not found - serving fallback page", "production");
    return;
  }

  log(`Serving static files from: ${distPath}`, "production");
  
  app.use(express.static(distPath));

  // Catch-all handler for client-side routing
  app.use("*", (req, res) => {
    // Don't interfere with API routes
    if (req.originalUrl.startsWith("/api")) {
      return res.status(404).json({ message: "API endpoint not found" });
    }
    
    // Serve index.html for client-side routing
    const indexPath = path.resolve(distPath!, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Application not found");
    }
  });
}