import { buildApp, configFromEnv } from "./app.js";

const app = buildApp(configFromEnv());
const port = Number(process.env.PORT ?? 8080);

try {
  await app.listen({ host: "0.0.0.0", port });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
