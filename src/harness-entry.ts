import { buildBot } from "./bot.js";
import { initStorage } from "./storage.js";

export async function makeBot() {
  initStorage(null);
  return buildBot(process.env.BOT_TOKEN ?? "harness-test-token");
}
