import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getOrCreateUser, upsertUser } from "../storage.js";

const PLANS = [
  {
    id: "pro",
    label: "⭐ Pro",
    price: "$9.99/mo",
    credits: 100,
    features: "100 credits/mo · No watermark · Priority queue",
  },
  {
    id: "lifetime",
    label: "💎 Lifetime",
    price: "$49.99 one-time",
    credits: 500,
    features: "500 credits · No watermark · Priority queue · Forever",
  },
];

const composer = new Composer<Ctx>();

composer.callbackQuery("sub:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.from) return;
  const user = await getOrCreateUser(ctx.from.id);

  const planLabel =
    user.planType === "lifetime"
      ? "💎 Lifetime"
      : user.planType === "pro"
        ? "⭐ Pro"
        : "Free";

  const lines = PLANS.map((p) => {
    const current = user.planType === p.id ? " (current)" : "";
    return `${p.label}${current}\n${p.price}\n${p.features}`;
  });

  await ctx.reply(
    `Your plan: ${planLabel}\nCredits: ${user.creditBalance} ⭐\n\n${lines.join("\n\n")}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⭐ Upgrade to Pro", "sub:buy:pro")],
        [inlineButton("💎 Get Lifetime", "sub:buy:lifetime")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery(/^sub:buy:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const planId = ctx.match![1];
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan || !ctx.from) return;

  const user = await getOrCreateUser(ctx.from.id);
  user.planType = plan.id as "pro" | "lifetime";
  user.creditBalance += plan.credits;
  await upsertUser(user);

  await ctx.reply(
    `🎉 Welcome to ${plan.label}!\n\n${plan.credits} credits added. You now have ${user.creditBalance} ⭐.\n\nTime to create some stunning portraits!`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("📸 Upload Selfie", "upload:start")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

export default composer;
