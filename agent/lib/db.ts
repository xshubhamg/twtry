// Local-first JSON queue. Works under Node and Bun, zero native deps.
// (bun:sqlite was deliberately avoided: eve tools run in the Node app
// runtime locally and on Vercel, where bun:sqlite is unavailable.)
// If this ever moves to hosted multi-user, swap this module for a KV adapter.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { PostStatus, QueuedPost } from "./topics.js";

function queueDir(): string {
  return resolve(process.cwd(), process.env.QUEUE_DIR ?? "./queue");
}

export function queueFile(): string {
  return join(queueDir(), "queue.json");
}

export function loadQueue(): QueuedPost[] {
  const file = queueFile();
  if (!existsSync(file)) return [];
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
    return Array.isArray(raw) ? (raw as QueuedPost[]) : [];
  } catch {
    return [];
  }
}

export function saveQueue(posts: QueuedPost[]): string {
  mkdirSync(queueDir(), { recursive: true });
  const file = queueFile();
  writeFileSync(file, JSON.stringify(posts, null, 2) + "\n");
  return file;
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 0xffff).toString(36)}`;
}

export function setStatus(posts: QueuedPost[], id: string, status: PostStatus): QueuedPost | null {
  const p = posts.find((x) => x.id === id) ?? null;
  if (p) p.status = status;
  return p;
}
