import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button, PageTitle, Sheet } from "@/components/ui";
import { getCurriculum } from "@/lib/curriculum";
import { parseSchedule } from "@/lib/db/domain";
import { createClient } from "@/lib/supabase/server";
import { archiveGroup } from "../actions";
import { GroupForm } from "../group-form";

export default async function GroupEditPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("teacher.groups");
  const supabase = await createClient();
  const [{ data: group }, curriculum] = await Promise.all([supabase.from("groups").select("*").eq("id", id).maybeSingle(), getCurriculum()]);
  if (!group) notFound();
  const grades = curriculum.map((g) => ({ id: g.id, label: (locale === "ar" ? g.title_ar : g.title_en) ?? g.code, editions: g.editions }));

  return (
    <>
      <PageTitle>{group.name}</PageTitle>
      <Sheet>
        <GroupForm grades={grades} group={{ ...group, schedule: parseSchedule(group.schedule) }} />
      </Sheet>
      <details className="mt-6">
        <summary className="cursor-pointer text-xs text-margin">{t("archive")}</summary>
        <form action={archiveGroup} className="mt-2">
          <input type="hidden" name="id" value={group.id} />
          <Button type="submit" variant="danger">
            {t("archive")}
          </Button>
        </form>
      </details>
    </>
  );
}
