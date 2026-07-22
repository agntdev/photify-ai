import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import {
  getOrCreateUser,
  upsertUser,
  getAsset,
  createJob,
  updateJob,
  saveAsset,
} from "../storage.js";

const VARIATION_COST = 1;

const composer = new Composer<Ctx>();

composer.callbackQuery(/^var:start:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const assetId = ctx.match![1];
  const asset = await getAsset(assetId);
  if (!asset) {
    await ctx.reply("That portrait wasn't found — it may have expired.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  if (!ctx.from) return;

  const user = await getOrCreateUser(ctx.from.id);
  if (user.creditBalance < VARIATION_COST) {
    await ctx.reply(
      `Not enough credits for a variation — need ${VARIATION_COST} ⭐ but you have ${user.creditBalance} ⭐.`,
      {
        reply_markup: inlineKeyboard([
          [inlineButton("⭐ Subscribe", "sub:show")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }

  ctx.session.viewingAssetId = assetId;
  ctx.session.step = "confirming_variation";
  await ctx.reply(
    `Create a variation of this portrait?\n\nCost: ${VARIATION_COST} ⭐ (you have ${user.creditBalance} ⭐)`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("✅ Generate variation", `var:confirm:${assetId}`)],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery(/^var:confirm:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const assetId = ctx.match![1];
  if (!ctx.from) return;

  const user = await getOrCreateUser(ctx.from.id);
  if (user.creditBalance < VARIATION_COST) {
    await ctx.reply("Credits ran out — top up to keep going.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⭐ Subscribe", "sub:show")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  const asset = await getAsset(assetId);
  if (!asset) {
    await ctx.reply("That portrait wasn't found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  user.creditBalance -= VARIATION_COST;
  await upsertUser(user);

  const job = await createJob({
    telegramId: ctx.from.id,
    styleCategory: asset.styleCategory ?? "Fashion",
    styleId: "variation",
    status: "generating",
    assetIds: [],
  });

  const newAssetId = `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const watermarkApplied = user.planType === "free";
  const newAsset = {
    assetId: newAssetId,
    jobId: job.jobId,
    telegramId: ctx.from.id,
    fileId: `generated_${newAssetId}`,
    format: "photo" as const,
    watermarkApplied,
    createdAt: Date.now(),
    styleCategory: asset.styleCategory ?? "Fashion",
  };
  await saveAsset(newAsset as any);

  job.status = "completed";
  job.assetIds = [newAssetId];
  await updateJob(job);

  const watermarkNote = watermarkApplied
    ? "\n💡 Free plan includes a small watermark — subscribe to remove it."
    : "";

  await ctx.reply(
    `✨ New variation ready!\n\nStyle: ${asset.styleCategory ?? "Portrait"}${watermarkNote}\n\nCredits remaining: ${user.creditBalance} ⭐`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🔄 Another variation", `var:start:${newAssetId}`)],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );

  ctx.session.step = "idle";
  ctx.session.viewingAssetId = undefined;
});

export default composer;
