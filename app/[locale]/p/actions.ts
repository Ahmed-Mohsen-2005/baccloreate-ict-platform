"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

/** Parent confirms consent for one of their children (§9 Q5). The database checks the family link. */
export async function confirmConsent(formData: FormData) {
  await requireRole("parent", await getLocale());
  const studentId = z.uuid().parse(formData.get("student_id"));
  const supabase = await createClient();
  await supabase.rpc("confirm_consent", { p_student_id: studentId });
  revalidatePath("/[locale]/p", "page");
}
