import { createServer } from "http";
import configuredApp from "./server/index.js";

const port = 5000;

configuredApp.then(app => {
  const server = createServer(app);
  server.listen(port, () => {
    console.log(`🚀 Server listening at http://localhost:${port}`);
  });
});
