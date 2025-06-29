import express from "express";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// Production-safe logging function
function log(message, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
    console.log(`${formattedTime} [${source}] ${message}`);
}
// Production static file serving
function serveStatic(app) {
    const distPath = path.resolve(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
            const indexPath = path.join(distPath, "index.html");
            if (fs.existsSync(indexPath)) {
                res.sendFile(indexPath);
            }
            else {
                res.status(404).send("Application not found");
            }
        });
    }
    else {
        // Fallback HTML for when dist doesn't exist
        app.get("*", (req, res) => {
            res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Recrutas - Loading</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; }
            .loader { margin: 20px auto; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <h1>Recrutas</h1>
          <div class="loader"></div>
          <p>Application is starting up...</p>
        </body>
        </html>
      `);
        });
    }
}
app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse = undefined;
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
    const server = await registerRoutes(app);
    app.use((err, _req, res, _next) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(status).json({ message });
        throw err;
    });
    // Production mode - only serve static files
    serveStatic(app);
    const port = process.env.PORT || 5000;
    server.listen(port, () => {
        log(`serving on port ${port}`);
    });
})();
