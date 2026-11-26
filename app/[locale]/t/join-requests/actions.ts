"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export async function approveRequest(formData: FormData) {
  await requireRole("teacher", await getLocale());
  const id = z.uuid().parse(formData.get("id"));
  const groupRaw = String(formData.get("group_id") ?? "");
  const groupId = groupRaw ? z.uuid().parse(groupRaw) : null;
  const supabase = await createClient();
  await supabase.rpc("approve_join_request", { p_request_id: id, p_group_id: groupId });
  revalidatePath("/[locale]/t", "layout");
}

export async function rejectRequest(formData: FormData) {
  await requireRole("teacher", await getLocale());
  const id = z.uuid().parse(formData.get("id"));
  const supabase = await createClient();
  await supabase
    .from("join_requests")
    .update({ status: "rejected", decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  revalidatePath("/[locale]/t", "layout");
}
