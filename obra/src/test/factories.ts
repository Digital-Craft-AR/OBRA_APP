/**
 * Test factories for common domain objects.
 *
 * Usage:
 *   import { makeSession, makeProject, makeChapterDraft } from "@/test/factories";
 *
 *   const session = makeSession();                          // defaults
 *   const project = makeProject({ id: "p-custom" });       // override fields
 *   const chapter = makeChapterDraft({ title: "Chapter 1" });
 */

import type { Session, User } from "@supabase/supabase-js";
import type { ChapterDraftRow } from "@/lib/wizard/contentIndexApi";

// ---------------------------------------------------------------------------
// Session / User
// ---------------------------------------------------------------------------

let _userCounter = 0;

/** Returns a minimal Supabase User object. */
export function makeUser(overrides: Partial<User> = {}): User {
  _userCounter++;
  return {
    id: `user-${_userCounter}`,
    aud: "authenticated",
    role: "authenticated",
    email: `user${_userCounter}@example.com`,
    email_confirmed_at: "2024-01-01T00:00:00.000Z",
    phone: "",
    confirmed_at: "2024-01-01T00:00:00.000Z",
    last_sign_in_at: "2024-01-01T00:00:00.000Z",
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    factors: [],
    ...overrides,
  };
}

/** Returns a minimal Supabase Session object. */
export function makeSession(overrides: Partial<Session> = {}): Session {
  const user = overrides.user ?? makeUser();
  return {
    access_token: "test-access-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "test-refresh-token",
    user,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Project (matches the DB row shape used across page tests)
// ---------------------------------------------------------------------------

let _projectCounter = 0;

export type ProjectRow = {
  id: string;
  user_id: string;
  content_locale: string;
  content_source: "ai" | "upload";
  topic: string | null;
  problem: string | null;
  target_avatar: string | null;
  author: string | null;
  structure_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Returns a minimal project row. All required fields are populated with sensible defaults. */
export function makeProject(overrides: Partial<ProjectRow> = {}): ProjectRow {
  _projectCounter++;
  return {
    id: `project-${_projectCounter}`,
    user_id: "user-1",
    content_locale: "es",
    content_source: "ai",
    topic: null,
    problem: null,
    target_avatar: null,
    author: null,
    structure_completed_at: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Chapter (ChapterDraftRow from contentIndexApi)
// ---------------------------------------------------------------------------

let _chapterCounter = 0;

/** Returns a minimal chapter draft row. */
export function makeChapterDraft(overrides: Partial<ChapterDraftRow> = {}): ChapterDraftRow {
  _chapterCounter++;
  return {
    id: `chapter-${_chapterCounter}`,
    title: `Chapter ${_chapterCounter}`,
    sort_order: _chapterCounter,
    content: "<p>Chapter content.</p>",
    approved_at: null,
    ...overrides,
  };
}
