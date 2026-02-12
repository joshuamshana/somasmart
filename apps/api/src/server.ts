import { createApp } from "./app";

async function main() {
  const app = await createApp();
  const port = Number(process.env.PORT || 4000);
  const host = process.env.HOST || "0.0.0.0";

  try {
    await app.listen({ port, host });
    app.log.info({ port, host }, "API server started");
  } catch (error) {
    app.log.error(error, "failed to start API server");
    process.exit(1);
  }
}

void main();
