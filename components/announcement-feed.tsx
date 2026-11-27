import { getFormatter, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

/** The latest announcements addressed to the signed-in student or parent (RLS decides which ones). */
export async function AnnouncementFeed({ limit = 5 }: { limit?: number }) {
  const t = await getTranslations("feed");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data } = await supabase.from("announcements").select("id, title, body, publish_at").order("publish_at", { ascending: false }).limit(limit);
  if (!data || data.length === 0) return null;

  return (
    <section aria-labelledby="feed-title" className="mt-8">
      <h2 id="feed-title" className="text-xl font-extrabold">
        {t("title")}
      </h2>
      <ul className="mt-3 flex flex-col gap-3">
        {data.map((a) => (
          <li key={a.id} className="rounded-[var(--radius-sheet)] border border-ruling bg-surface p-4">
            <p className="text-xs text-pencil">{format.dateTime(new Date(a.publish_at), { dateStyle: "medium", timeZone: "Africa/Cairo" })}</p>
            <p className="mt-1 font-extrabold">{a.title}</p>
            <p className="mt-1 whitespace-pre-line">{a.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
