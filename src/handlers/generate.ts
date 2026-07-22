import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import {
  getOrCreateUser,
  upsertUser,
  createJob,
  updateJob,
  saveAsset,
  type JobRecord,
} from "../storage.js";

const STYLES = [
  { id: "fashion_editorial", label: "👗 Fashion Editorial", cost: 2, category: "Fashion" },
  { id: "runway_glam", label: "👠 Runway Glam", cost: 2, category: "Fashion" },
  { id: "street_style", label: "🧥 Street Style", cost: 1, category: "Fashion" },
  { id: "vintage_portrait", label: "🖼 Vintage Portrait", cost: 2, category: "Portrait" },
  { id: "high_fashion", label: "💎 High Fashion", cost: 3, category: "Fashion" },
  { id: "casual_chic", label: "👜 Casual Chic", cost: 1, category: "Fashion" },
];

function styleById(id: string) {
  return STYLES.find((s) => s.id === id);
}

function generateAssetId(): string {
  return `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const composer = new Composer<Ctx>();

composer.callbackQuery("gen:pick", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.session.pendingUpload) {
    await ctx.reply(
      "No selfie found — tap Upload Selfie to start fresh.",
      {
        reply_markup: inlineKeyboard([[inlineButton("📸 Upload Selfie", "upload:start")]]),
      },
    );
    return;
  }
  ctx.session.step = "choosing_style";
  const keyboard = STYLES.map((s) => [
    inlineButton(`${s.label} (${s.cost} ⭐)`, `gen:style:${s.id}`),
  ]);
  keyboard.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.reply(
    "Pick a style for your fashion portrait:",
    { reply_markup: inlineKeyboard(keyboard) },
  );
});

composer.callbackQuery(/^gen:style:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const styleId = ctx.match![1];
  const style = styleById(styleId);
  if (!style) {
    await ctx.reply("Unknown style — try again.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  if (!ctx.from) return;

  const user = await getOrCreateUser(ctx.from.id);
  if (user.creditBalance < style.cost) {
    await ctx.reply(
      `Not enough credits — this style costs ${style.cost} ⭐ but you have ${user.creditBalance} ⭐.\n\nTop up to keep creating!`,
      {
        reply_markup: inlineKeyboard([
          [inlineButton("⭐ Subscribe", "sub:show")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }

  ctx.session.pendingJob = {
    styleCategory: style.category,
    styleId: style.id,
    creditCost: style.cost,
  };
  ctx.session.step = "confirming_job";
  await ctx.reply(
    `You picked ${style.label}.\n\nThis will use ${style.cost} ⭐ from your balance (${user.creditBalance} ⭐).\n\nReady to generate?`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("✅ Generate", "gen:confirm")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery("gen:confirm", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.session.pendingUpload || !ctx.session.pendingJob) {
    await ctx.reply("Something went wrong — start over from the menu.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  if (!ctx.from) return;

  const user = await getOrCreateUser(ctx.from.id);
  const job = ctx.session.pendingJob;
  if (user.creditBalance < job.creditCost) {
    await ctx.reply("Credits ran out — top up to keep going.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⭐ Subscribe", "sub:show")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  user.creditBalance -= job.creditCost;
  await upsertUser(user);

  const created = await createJob({
    telegramId: ctx.from.id,
    styleCategory: job.styleCategory,
    styleId: job.styleId,
    customPrompt: job.customPrompt,
    status: "generating",
    assetIds: [],
  });

  const assetId = generateAssetId();
  const watermarkApplied = user.planType === "free";
  const asset = {
    assetId,
    jobId: created.jobId,
    telegramId: ctx.from.id,
    fileId: `generated_${assetId}`,
    format: "photo" as const,
    watermarkApplied,
    createdAt: Date.now(),
  };
  await saveAsset(asset);

  created.status = "completed";
  created.assetIds = [assetId];
  await updateJob(created);

  const watermarkNote = watermarkApplied
    ? "\n💡 Free plan includes a small watermark — subscribe to remove it."
    : "";
  const kb = inlineKeyboard([
    [inlineButton("🔄 Variations", `var:start:${assetId}`)],
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);

  await ctx.reply(
    `✨ Your fashion portrait is ready!\n\nStyle: ${job.styleCategory}${watermarkNote}\n\nCredits remaining: ${user.creditBalance} ⭐`,
    { reply_markup: kb },
  );

  ctx.session.step = "idle";
  ctx.session.pendingUpload = undefined;
  ctx.session.pendingJob = undefined;
});

export default composer;
