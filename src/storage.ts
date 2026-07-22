import type { RedisLike } from "./toolkit/session/redis.js";

export interface UserRecord {
  telegramId: number;
  creditBalance: number;
  planType: "free" | "pro" | "lifetime";
  recentJobIds: string[];
  joinedAt: number;
}

export interface JobRecord {
  jobId: string;
  telegramId: number;
  styleCategory: string;
  styleId: string;
  customPrompt?: string;
  status: "pending" | "generating" | "completed" | "failed";
  assetIds: string[];
  createdAt: number;
}

export interface AssetRecord {
  assetId: string;
  jobId: string;
  telegramId: number;
  fileId: string;
  format: "photo" | "video";
  styleCategory?: string;
  watermarkApplied: boolean;
  createdAt: number;
}

let client: RedisLike | null = null;

export function initStorage(redisClient: RedisLike | null): void {
  client = redisClient;
}

export function getStorageClient(): RedisLike | null {
  return client;
}

// ── User ──────────────────────────────────────────────────────────

export async function getUser(telegramId: number): Promise<UserRecord | null> {
  if (!client) return null;
  const raw = await client.get(`photify:user:${telegramId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserRecord;
  } catch {
    return null;
  }
}

export async function upsertUser(record: UserRecord): Promise<void> {
  if (!client) return;
  await client.set(`photify:user:${record.telegramId}`, JSON.stringify(record));
}

export async function getOrCreateUser(telegramId: number): Promise<UserRecord> {
  const existing = await getUser(telegramId);
  if (existing) return existing;
  const newUser: UserRecord = {
    telegramId,
    creditBalance: 10,
    planType: "free",
    recentJobIds: [],
    joinedAt: Date.now(),
  };
  await upsertUser(newUser);
  return newUser;
}

// ── Job ───────────────────────────────────────────────────────────

export async function createJob(
  job: Omit<JobRecord, "jobId" | "createdAt">,
): Promise<JobRecord> {
  const full: JobRecord = {
    ...job,
    jobId: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  if (client) {
    await client.set(`photify:job:${full.jobId}`, JSON.stringify(full));
    const user = await getUser(full.telegramId);
    if (user) {
      user.recentJobIds = [full.jobId, ...user.recentJobIds].slice(0, 20);
      await upsertUser(user);
    }
  }
  return full;
}

export async function getJob(jobId: string): Promise<JobRecord | null> {
  if (!client) return null;
  const raw = await client.get(`photify:job:${jobId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as JobRecord;
  } catch {
    return null;
  }
}

export async function updateJob(job: JobRecord): Promise<void> {
  if (!client) return;
  await client.set(`photify:job:${job.jobId}`, JSON.stringify(job));
}

// ── Asset ─────────────────────────────────────────────────────────

export async function saveAsset(asset: AssetRecord): Promise<void> {
  if (!client) return;
  await client.set(`photify:asset:${asset.assetId}`, JSON.stringify(asset));
  const idxKey = `photify:user:${asset.telegramId}:assets`;
  const raw = await client.get(idxKey);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  ids.unshift(asset.assetId);
  await client.set(idxKey, JSON.stringify(ids.slice(0, 100)));
}

export async function getAsset(assetId: string): Promise<AssetRecord | null> {
  if (!client) return null;
  const raw = await client.get(`photify:asset:${assetId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AssetRecord;
  } catch {
    return null;
  }
}

export async function getUserAssets(telegramId: number, limit = 10): Promise<AssetRecord[]> {
  if (!client) return [];
  const idxKey = `photify:user:${telegramId}:assets`;
  const raw = await client.get(idxKey);
  if (!raw) return [];
  const ids: string[] = JSON.parse(raw);
  const assets: AssetRecord[] = [];
  for (const id of ids.slice(0, limit)) {
    const a = await getAsset(id);
    if (a) assets.push(a);
  }
  return assets;
}

export async function deleteAsset(assetId: string): Promise<void> {
  if (!client) return;
  await client.del(`photify:asset:${assetId}`);
}
