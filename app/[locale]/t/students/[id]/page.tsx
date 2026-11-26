import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Term } from "@/components/term";
import { PageTitle, Sheet, buttonClass } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentForm } from "./student-form";

export default async function StudentProfile({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("teacher.students");
  const format = await getFormatter();
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!student) notFound();

  const [{ data: groups }, { data: grade }, { data: links }, { data: consents }, { data: code }] = await Promise.all([
    supabase.from("groups").select("id, name").eq("grade_level_id", student.grade_level_id).is("archived_at", null).order("name"),
    supabase.from("grade_levels").select("editions").eq("id", student.grade_level_id).single(),
    supabase.from("guardianships").select("parent_id").eq("student_id", id),
    supabase.from("consents").select("*").eq("student_id", id).order("given_at"),
    supabase.from("access_codes").select("issued_at").eq("subject_type", "student").eq("subject_id", id).is("revoked_at", null).maybeSingle(),
  ]);
  const { data: parents } = await supabase
    .from("parents")
    .select("id, phone_e164, email")
    .in("id", (links ?? []).map((l) => l.parent_id));

  return (
    <>
      <PageTitle>{student.display_name}</PageTitle>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Sheet>
          <h2 className="mb-4 text-lg font-extrabold">{t("profile")}</h2>
          <StudentForm student={student} groups={groups ?? []} editions={grade?.editions ?? ["en"]} />
        </Sheet>

        <div className="flex flex-col gap-6">
          <Sheet>
            <h2 className="text-lg font-extrabold">{t("codes")}</h2>
            <p className="mt-1 text-pencil">
              {code ? t("codeActive", { date: format.dateTime(new Date(code.issued_at), { dateStyle: "medium" }) }) : t("codeNone")}
            </p>
            <Link href={{ pathname: "/t/codes", query: { show: "all" } }} className={buttonClass("secondary", "mt-3")}>
              {t("sendCodes")}
            </Link>
          </Sheet>

          <Sheet>
            <h2 className="text-lg font-extrabold">{t("parents")}</h2>
            <ul className="mt-2 flex flex-col gap-1">
              {(parents ?? []).map((p) => (
                <li key={p.id} className="flex flex-col">
                  <Term>{p.phone_e164}</Term>
                  {p.email && (
                    <span className="text-xs text-pencil">
                      <Term>{p.email}</Term>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Sheet>

          <Sheet>
            <h2 className="text-lg font-extrabold">{t("consents")}</h2>
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {(consents ?? []).map((c) => (
                <li key={c.id}>
                  <span className="font-semibold">{t(`consentMethods.${c.method}`)}</span>
                  <span className="block text-xs text-pencil">{format.dateTime(new Date(c.given_at), { dateStyle: "medium", timeStyle: "short" })}</span>
                </li>
              ))}
            </ul>
          </Sheet>
        </div>
      </div>
    </>
  );
}
