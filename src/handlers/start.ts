import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { mainMenuKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "📸 Upload Selfie", data: "upload:start", order: 10 });
registerMainMenuItem({ label: "🖼 My Assets", data: "assets:list", order: 20 });
registerMainMenuItem({ label: "⭐ Subscribe", data: "sub:show", order: 30 });

const composer = new Composer<Ctx>();

const WELCOME = "👋 Welcome to Photify AI!\n\nTransform your selfies into stunning fashion portraits — pick a style, and I'll create something amazing for you.\n\nTap a button below to get started.";

composer.command("start", async (ctx) => {
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
