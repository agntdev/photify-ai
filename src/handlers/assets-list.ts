import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getUserAssets } from "../storage.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("assets:list", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.from) return;
  const assets = await getUserAssets(ctx.from.id, 5);
  if (assets.length === 0) {
    await ctx.reply(
      "🖼 No portraits yet — upload a selfie to create your first one!",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("📸 Upload Selfie", "upload:start")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }

  const lines = assets.map((a, i) => {
    const wm = a.watermarkApplied ? " (watermarked)" : "";
    return `${i + 1}. ${a.format === "photo" ? "📸" : "🎬"} ${a.styleCategory ?? "Portrait"}${wm}`;
  });

  await ctx.reply(
    `🖼 Your recent portraits:\n\n${lines.join("\n")}\n\nTap one to view or create variations.`,
    {
      reply_markup: inlineKeyboard([
        ...assets.map((a) => [
          inlineButton(`${a.styleCategory ?? "Portrait"}`, `var:start:${a.assetId}`),
        ]),
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

export default composer;
