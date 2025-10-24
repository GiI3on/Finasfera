"use client";

const base = "";

async function handle(res) {
  if (!res.ok) {
    let error = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) error = body.error;
    } catch {
      // ignore
    }
    throw new Error(error);
  }
  return res.json();
}

export async function listThreads() {
  const res = await fetch(`${base}/api/forum/threads`, { cache: "no-store" });
  const data = await handle(res);
  return Array.isArray(data?.threads) ? data.threads : [];
}

export async function createThread(payload) {
  const res = await fetch(`${base}/api/forum/threads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function listPosts(threadId) {
  const res = await fetch(
    `${base}/api/forum/threads/${encodeURIComponent(threadId)}/posts`,
    { cache: "no-store" }
  );
  const data = await handle(res);
  return Array.isArray(data?.posts) ? data.posts : [];
}

export async function createPost(threadId, payload) {
  const res = await fetch(
    `${base}/api/forum/threads/${encodeURIComponent(threadId)}/posts`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return handle(res);
}
