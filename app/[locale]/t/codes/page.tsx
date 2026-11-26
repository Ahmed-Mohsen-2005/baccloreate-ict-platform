import { getTranslations, setRequestLocale } from "next-intl/server";
import { Notice, PageTitle } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getSiteSettings } from "@/lib/curriculum";
import { createClient } from "@/lib/supabase/server";
import { CodesBoard, type Family } from "./codes-board";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ show?: string }> };

export default async function CodesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { show } = await searchParams;
  const showAll = show === "all";
  const t = await getTranslations("teacher.codes");
  const supabase = await createClient();

  const [{ data: parents }, { data: guardianships }, { data: students }, { data: messages }, settings] = await Promise.all([
    supabase.from("parents").select("id, phone_e164").is("deleted_at", null),
    supabase.from("guardianships").select("parent_id, student_id"),
    supabase.from("students").select("id, display_name").eq("status", "active").is("deleted_at", null),
    supabase.from("messages").select("recipient_parent_id, created_at").eq("template", "codes").order("created_at", { ascending: false }),
    getSiteSettings(),
  ]);

  const nameById = new Map((students ?? []).map((s) => [s.id, s.display_name]));
  const lastSent = new Map<string, string>();
  for (const m of messages ?? []) if (m.recipient_parent_id && !lastSent.has(m.recipient_parent_id)) lastSent.set(m.recipient_parent_id, m.created_at);

  const families: Family[] = (parents ?? [])
    .map((p) => ({
      parentId: p.id,
      phone: p.phone_e164,
      children: (guardianships ?? [])
        .filter((g) => g.parent_id === p.id)
        .map((g) => nameById.get(g.student_id))
        .filter((n): n is string => Boolean(n)),
      lastSentAt: lastSent.get(p.id) ?? null,
    }))
    .filter((f) => f.children.length > 0 && (showAll || !f.lastSentAt))
    .sort((a, b) => (a.children[0] ?? "").localeCompare(b.children[0] ?? "", locale));

  return (
    <>
      <PageTitle intro={t("intro")}>{t("title")}</PageTitle>
      {!settings?.teacher_title && (
        <div className="mb-4">
          <Notice>{t("noTitle")}</Notice>
        </div>
      )}
      <nav className="mb-4 flex gap-2 text-sm">
        <Link
          href={{ pathname: "/t/codes" }}
          aria-current={!showAll ? "page" : undefined}
          className="rounded-[var(--radius-chip)] px-3 py-1 aria-[current=page]:bg-ink aria-[current=page]:text-paper"
        >
          {t("filterUnsent")}
        </Link>
        <Link
          href={{ pathname: "/t/codes", query: { show: "all" } }}
          aria-current={showAll ? "page" : undefined}
          className="rounded-[var(--radius-chip)] px-3 py-1 aria-[current=page]:bg-ink aria-[current=page]:text-paper"
        >
          {t("filterAll")}
        </Link>
      </nav>
      <CodesBoard families={families} />
    </>
  );
}
