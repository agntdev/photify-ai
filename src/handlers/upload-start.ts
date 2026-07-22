import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getOrCreateUser } from "../storage.js";

const composer = new Composer<Ctx>();

const UPLOAD_PROMPT =
  "📸 Send me a selfie — a clear, front-facing photo works best.\n\n" +
  "I'll use it to create your fashion portrait. Your photo is private and deleted after processing.";

composer.callbackQuery("upload:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (ctx.from) {
    await getOrCreateUser(ctx.from.id);
  }
  ctx.session.step = "awaiting_selfie";
  await ctx.reply(UPLOAD_PROMPT, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

composer.on("message:photo", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_selfie") return next();
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const fileHash = `${photo.file_id.slice(0, 8)}_${Date.now()}`;
  ctx.session.pendingUpload = { fileId: photo.file_id, fileHash };
  ctx.session.step = "confirming_upload";
  await ctx.reply(
    "Nice selfie! I'll use this for your fashion portrait.\n\nReady to pick a style?",
    {
      reply_markup: inlineKeyboard([
        [inlineButton("✨ Pick a style", "gen:pick")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_selfie") return next();
  await ctx.reply(
    "That doesn't look like a photo — please send a selfie (an image file).",
    {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    },
  );
});

export default composer;
