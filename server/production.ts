import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

function serveStatic(app: express.Express) {
  const staticPath = path.join(__dirname, "../dist/public");
  const indexPath = path.join(staticPath, "index.html");
  
  // Serve static files
  app.use(express.static(staticPath));
  
  // Handle client-side routing - serve index.html for all non-API routes
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    
    // Check if index.html exists before serving
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Static files not found. Check build configuration.");
    }
  });
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    log("Starting production server...");
    
    // Add error handling for missing environment variables
    if (!process.env.DATABASE_URL) {
      log("ERROR: DATABASE_URL environment variable is required");
      process.exit(1);
    }
    
    if (!process.env.SESSION_SECRET) {
      log("WARNING: SESSION_SECRET not set, using default");
      process.env.SESSION_SECRET = 'production-secret-key-please-change';
    }
    
    const server = await registerRoutes(app);
    
    // Serve static files in production
    serveStatic(app);

    const PORT = parseInt(process.env.PORT || "5000");
    
    server.on('error', (error) => {
      log(`Server error: ${error.message}`, "error");
    });
    
    server.listen(PORT, "0.0.0.0", () => {
      log(`serving on port ${PORT}`);
      log("Production server started successfully");
    });
    
  } catch (error) {
    log(`Failed to start server: ${error.message}`, "error");
    process.exit(1);
  }
})();