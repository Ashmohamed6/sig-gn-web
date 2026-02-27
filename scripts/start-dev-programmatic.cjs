const http = require("http");
const next = require("next");

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "0.0.0.0";

async function main() {
  const app = next({
    dev: true,
    hostname: host,
    port,
    dir: process.cwd(),
  });

  const handle = app.getRequestHandler();
  await app.prepare();

  const server = http.createServer((req, res) => handle(req, res));
  server.listen(port, host, () => {
    // Keep output simple for log parsing.
    console.log(`READY ${host}:${port}`);
  });
}

main().catch((error) => {
  console.error("START_FAILED", error && error.stack ? error.stack : String(error));
  process.exit(1);
});
