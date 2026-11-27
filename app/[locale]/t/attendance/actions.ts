"use server";

import { randomInt } from "node:crypto";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/viewer";
import type { AttendanceStatus } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid();
const status = z.enum(["present", "late", "absent"]);

async function guard() {
  const viewer = await requireRole("teacher", await getLocale());
  return { viewer, supabase: await createClient() };
}

/** One tap: sets a student's status for a session (a teacher mark always wins over a self check-in). */
export async function markAttendance(sessionId: string, studentId: string, value: AttendanceStatus): Promise<{ ok: boolean }> {
  const { viewer, supabase } = await guard();
  const { error } = await supabase.from("attendance").upsert(
    { session_id: uuid.parse(sessionId), student_id: uuid.parse(studentId), status: status.parse(value), method: "tap", marked_by: viewer.userId, marked_at: new Date().toISOString() },
    { onConflict: "session_id,student_id" },
  );
  return { ok: !error };
}

/** "All present": marks everyone in the group who has no mark yet. Existing marks stay as they are. */
export async function markAllPresent(sessionId: string): Promise<{ ok: boolean; marked: number }> {
  const { viewer, supabase } = await guard();
  const id = uuid.parse(sessionId);
  const { data: session } = await supabase.from("class_sessions").select("group_id").eq("id", id).single();
  if (!session) return { ok: false, marked: 0 };

  const [{ data: students }, { data: marks }] = await Promise.all([
    supabase.from("students").select("id").eq("group_id", session.group_id).eq("status", "active").is("deleted_at", null),
    supabase.from("attendance").select("student_id").eq("session_id", id),
  ]);
  const marked = new Set((marks ?? []).map((m) => m.student_id));
  const rows = (students ?? [])
    .filter((s) => !marked.has(s.id))
    .map((s) => ({ session_id: id, student_id: s.id, status: "present" as const, method: "tap" as const, marked_by: viewer.userId }));
  if (rows.length === 0) return { ok: true, marked: 0 };
  const { error } = await supabase.from("attendance").insert(rows);
  return { ok: !error, marked: error ? 0 : rows.length };
}

const CODE_TTL_SECONDS = 150;

/** New 4-digit check-in code (also carried by the QR). Valid for a couple of minutes, then the page rotates it. */
export async function rotateCheckinCode(sessionId: string): Promise<{ ok: true; code: string; expiresAt: string } | { ok: false }> {
  const { supabase } = await guard();
  const code = String(randomInt(0, 10000)).padStart(4, "0");
  const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString();
  const { error } = await supabase.from("class_sessions").update({ checkin_code: code, checkin_expires_at: expiresAt }).eq("id", uuid.parse(sessionId));
  return error ? { ok: false } : { ok: true, code, expiresAt };
}

export async function stopCheckin(sessionId: string): Promise<{ ok: boolean }> {
  const { supabase } = await guard();
  const { error } = await supabase.from("class_sessions").update({ checkin_code: null, checkin_expires_at: null }).eq("id", uuid.parse(sessionId));
  return { ok: !error };
}
