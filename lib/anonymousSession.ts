"use client";

const STORAGE_KEY = "bakuflow.anon_session_id";

/**
 * A random id kept only in this browser's localStorage, used solely to
 * de-duplicate anonymous trip search demand stats server-side (spec section
 * 18/20). It is never linked to a real identity and never sent alongside
 * crowd reports, which always require authentication.
 */
export function getOrCreateAnonymousSessionId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const created =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
