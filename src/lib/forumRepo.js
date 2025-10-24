import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";
import { app } from "@/app/lib/firebase";

const db = getFirestore(app);

function toIso(ts) {
  return ts?.toDate?.()?.toISOString() || null;
}

function normalizeThread(snapshot) {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    slug: data.slug || snapshot.id,
    title: data.title || "",
    authorName: data.authorName || data.author?.name || "Anon",
    content: data.content || "",
    createdAt: toIso(data.createdAt) || new Date().toISOString(),
    lastActivityAt: toIso(data.lastActivityAt),
    likes: Number(data.likes || 0),
    comments: Number(data.comments || 0),
    pinned: !!data.pinned,
    featured: !!data.featured,
    tags: Array.isArray(data.tags) ? data.tags : [],
    tag: Array.isArray(data.tags) ? data.tags[0] : data.tag || "",
  };
}

function normalizePost(snapshot) {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    body: data.body || "",
    authorName: data.authorName || "Anon",
    createdAt: toIso(data.createdAt),
  };
}

export async function listThreadsRepo() {
  const snap = await getDocs(collection(db, "threads"));
  const rows = snap.docs.map(normalizeThread);
  rows.sort(
    (a, b) =>
      (b.pinned === true) - (a.pinned === true) ||
      new Date(b.createdAt) - new Date(a.createdAt)
  );
  return rows;
}

export async function createThreadRepo({ title, content, tags = [], author }) {
  const payload = {
    title,
    content,
    tags,
    authorName: author?.name || author || "Anon",
    authorId: author?.id || null,
    slug: null,
    createdAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
    likes: 0,
    comments: 0,
    pinned: false,
    featured: false,
  };

  const ref = await addDoc(collection(db, "threads"), payload);
  const snap = await getDoc(ref);
  return normalizeThread(snap);
}

export async function getThreadRepo(id) {
  const ref = doc(db, "threads", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return normalizeThread(snap);
}

export async function listPostsRepo(threadId) {
  const snap = await getDocs(collection(db, "threads", threadId, "posts"));
  return snap.docs
    .map(normalizePost)
    .sort(
      (a, b) =>
        new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    );
}

export async function createPostRepo(threadId, { body, authorName, authorId }) {
  const postsCollection = collection(db, "threads", threadId, "posts");
  await addDoc(postsCollection, {
    body,
    authorName: authorName || "Anon",
    authorId: authorId || null,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "threads", threadId), {
    comments: increment(1),
    lastActivityAt: serverTimestamp(),
  });
}
