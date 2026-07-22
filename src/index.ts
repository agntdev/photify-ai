import { buildBot } from "./bot.js";
import { setDefaultCommands } from "./toolkit/index.js";
import { initStorage } from "./storage.js";

async function main() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.error("BOT_TOKEN is required");
    process.exit(1);
  }
  if (process.env.REDIS_URL) {
    const { createRequire } = await import("node:module");
    const req = createRequire(import.meta.url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ioredis: any = req("ioredis");
    const Redis = ioredis.default ?? ioredis.Redis ?? ioredis;
    initStorage(new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: false }));
  }
  const bot = await buildBot(token);
  await setDefaultCommands(bot);
  bot.start();
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
