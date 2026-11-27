import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageTitle } from "@/components/ui";
import { requireRole } from "@/lib/auth/viewer";
import { CheckinForm } from "./checkin-form";

/** Reached by typing the code, or by scanning the teacher's QR (which opens this page with ?code=). */
export default async function CheckinPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ code?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole("student", locale);
  const { code } = await searchParams;
  const t = await getTranslations("student.checkin");
  const initial = /^[0-9]{4}$/.test(code ?? "") ? (code as string) : "";

  return (
    <>
      <PageTitle intro={t("intro")}>{t("title")}</PageTitle>
      <CheckinForm initialCode={initial} />
    </>
  );
}
