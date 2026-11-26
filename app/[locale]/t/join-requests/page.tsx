import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Term } from "@/components/term";
import { Button, PageTitle, Select } from "@/components/ui";
import { getCurriculum } from "@/lib/curriculum";
import { createClient } from "@/lib/supabase/server";
import { approveRequest, rejectRequest } from "./actions";

export default async function JoinRequestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("teacher.joinRequests");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const supabase = await createClient();

  const [{ data: requests }, { data: groups }, curriculum] = await Promise.all([
    supabase.from("join_requests").select("*").eq("status", "pending").order("created_at"),
    supabase.from("groups").select("id, name, grade_level_id, venue").is("archived_at", null).order("name"),
    getCurriculum(),
  ]);
  const gradeLabel = new Map(curriculum.map((g) => [g.id, locale === "ar" ? g.title_ar : g.title_en]));

  return (
    <>
      <PageTitle>{t("title")}</PageTitle>
      {(requests ?? []).length === 0 ? (
        <p className="text-pencil">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {(requests ?? []).map((r) => {
            const options = (groups ?? []).filter((g) => g.grade_level_id === r.grade_level_id);
            return (
              <li key={r.id} className="rounded-[var(--radius-sheet)] border border-ruling bg-surface p-4">
                <p className="text-lg font-extrabold">{r.student_name}</p>
                <p className="flex flex-wrap gap-x-3 text-xs text-pencil">
                  <span>{gradeLabel.get(r.grade_level_id)}</span>
                  <span>{tc(r.venue)}</span>
                  <Term>{r.parent_phone}</Term>
                  {r.student_email && <Term>{r.student_email}</Term>}
                </p>
                <p className="mt-1 text-xs text-pencil">
                  {t("consentAt", { date: format.dateTime(new Date(r.consent_given_at), { dateStyle: "medium", timeStyle: "short" }) })}
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <form action={approveRequest} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <label className="flex flex-col text-xs">
                      {tc("group")}
                      <Select name="group_id" defaultValue={options.find((g) => g.venue === r.venue)?.id ?? ""} className="w-48">
                        <option value="">{tc("noGroup")}</option>
                        {options.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <Button type="submit">{t("approve")}</Button>
                  </form>
                  <form action={rejectRequest}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" variant="quiet">
                      {t("reject")}
                    </Button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
