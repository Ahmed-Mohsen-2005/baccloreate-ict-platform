/**
 * Database types for supabase-js, hand-written to mirror supabase/migrations/*.sql
 * (same shape as `supabase gen types typescript`). Regenerate with the CLI once linked:
 *   npx supabase gen types typescript --linked > lib/db/types.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "teacher" | "student" | "parent";
export type Edition = "ar" | "en";
export type Venue = "online" | "offline";
export type Gender = "m" | "f";
export type StudentStatus = "active" | "pending" | "archived";
export type SubjectType = "student" | "parent";
export type DomainEnum = "society" | "cipher" | "protocol" | "swatch" | "data" | "signal" | "neuron" | "programming";
export type JoinStatus = "pending" | "approved" | "rejected";
export type ConsentKind = "guardian_data" | "ai_tutor";
export type ConsentMethod = "import_attested" | "signup_checkbox" | "parent_portal";
export type MessageStatus = "draft" | "opened" | "sent" | "failed";

type Stamps = { created_at: string; updated_at: string };
/** Insert type: required keys stay required, generated/defaulted keys become optional. */
type Ins<Row, Optional extends keyof Row> = Omit<Row, Optional | keyof Stamps> & Partial<Pick<Row, Optional>> & Partial<Stamps>;
type Table<Row, Optional extends keyof Row> = {
  Row: Row;
  Insert: Ins<Row, Optional>;
  Update: Partial<Row>;
  Relationships: [];
};

export type ProfileRow = Stamps & { user_id: string; role: UserRole; locale: string; theme: string };
export type TeacherAllowlistRow = Stamps & { email: string };
export type SiteSettingsRow = Stamps & {
  id: boolean;
  teacher_name: string;
  teacher_title: string;
  bio_ar: string;
  bio_en: string;
  photo_key: string | null;
  years_experience: number | null;
  whatsapp_e164: string | null;
  socials: Json;
  ai_features: Json;
  consent_policy_version: string;
};
export type GradeLevelRow = Stamps & {
  id: string;
  code: string;
  number: number;
  title_ar: string;
  title_en: string;
  editions: Edition[];
  position: number;
};
export type UnitRow = Stamps & {
  id: string;
  grade_level_id: string;
  code: string;
  title_ar: string | null;
  title_en: string;
  term: number | null;
  domain: DomainEnum;
  position: number;
};
export type LessonRow = Stamps & {
  id: string;
  unit_id: string;
  code: string;
  title_ar: string | null;
  title_en: string;
  page_en: number | null;
  page_ar: number | null;
  domain: DomainEnum | null;
  position: number;
};
export type TopicRow = Stamps & { id: string; lesson_id: string; title_ar: string | null; title_en: string; position: number };
export type QuestionStyleRow = Stamps & {
  id: string;
  key: string;
  label_ar: string | null;
  label_en: string;
  source: string;
  grade_codes: string[];
  kind: string;
  position: number;
};
export type GroupRow = Stamps & {
  id: string;
  name: string;
  grade_level_id: string;
  edition: Edition;
  venue: Venue;
  meet_url: string | null;
  schedule: Json;
  timezone: string;
  archived_at: string | null;
};
export type StudentRow = Stamps & {
  id: string;
  external_id: string | null;
  display_name: string;
  grade_level_id: string;
  group_id: string | null;
  edition: Edition;
  venue: Venue;
  gender: Gender | null;
  phone_e164: string | null;
  google_email: string | null;
  status: StudentStatus;
  deleted_at: string | null;
};
export type ParentRow = Stamps & {
  id: string;
  display_name: string | null;
  phone_e164: string;
  email: string | null;
  deleted_at: string | null;
};
export type GuardianshipRow = Stamps & { id: string; parent_id: string; student_id: string; relation: string | null };
export type AccountLinkRow = Stamps & { user_id: string; subject_type: SubjectType; subject_id: string; method: "code" | "google" };
export type ConsentRow = Stamps & {
  id: string;
  student_id: string;
  parent_id: string | null;
  kind: ConsentKind;
  policy_version: string;
  method: ConsentMethod;
  given_at: string;
  withdrawn_at: string | null;
};
export type AccessCodeRow = Stamps & {
  id: string;
  subject_type: SubjectType;
  subject_id: string;
  code_hmac: string;
  issued_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
};
export type JoinRequestRow = Stamps & {
  id: string;
  student_name: string;
  grade_level_id: string;
  edition: Edition;
  venue: Venue;
  gender: Gender | null;
  student_phone: string | null;
  student_email: string | null;
  parent_phone: string;
  parent_email: string | null;
  consent_given_at: string;
  consent_version: string;
  status: JoinStatus;
  decided_at: string | null;
  student_id: string | null;
};
export type MessageRow = Stamps & {
  id: string;
  channel: "whatsapp_link" | "whatsapp_api";
  template: string;
  recipient_parent_id: string | null;
  recipient_phone: string;
  payload: Json;
  status: MessageStatus;
  provider_ref: string | null;
};
export type AuditLogRow = Stamps & {
  id: number;
  actor: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before: Json | null;
  after: Json | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "locale" | "theme">;
      teacher_allowlist: Table<TeacherAllowlistRow, never>;
      site_settings: Table<
        SiteSettingsRow,
        | "id" | "teacher_name" | "teacher_title" | "bio_ar" | "bio_en" | "photo_key" | "years_experience"
        | "whatsapp_e164" | "socials" | "ai_features" | "consent_policy_version"
      >;
      grade_levels: Table<GradeLevelRow, "id" | "position">;
      units: Table<UnitRow, "id" | "title_ar" | "term" | "position">;
      lessons: Table<LessonRow, "id" | "title_ar" | "page_en" | "page_ar" | "domain" | "position">;
      topics: Table<TopicRow, "id" | "title_ar" | "position">;
      question_styles: Table<QuestionStyleRow, "id" | "label_ar" | "grade_codes" | "kind" | "position">;
      groups: Table<GroupRow, "id" | "meet_url" | "schedule" | "timezone" | "archived_at">;
      students: Table<
        StudentRow,
        "id" | "external_id" | "group_id" | "edition" | "gender" | "phone_e164" | "google_email" | "status" | "deleted_at"
      >;
      parents: Table<ParentRow, "id" | "display_name" | "email" | "deleted_at">;
      guardianships: Table<GuardianshipRow, "id" | "relation">;
      account_links: Table<AccountLinkRow, never>;
      consents: Table<ConsentRow, "id" | "parent_id" | "given_at" | "withdrawn_at">;
      access_codes: Table<AccessCodeRow, "id" | "issued_at" | "revoked_at" | "last_used_at">;
      join_requests: Table<JoinRequestRow, "id" | "edition" | "gender" | "student_phone" | "student_email" | "parent_email" | "status" | "decided_at" | "student_id">;
      messages: Table<MessageRow, "id" | "channel" | "recipient_parent_id" | "payload" | "status" | "provider_ref">;
      audit_log: Table<AuditLogRow, "id" | "actor" | "entity_id" | "before" | "after">;
    };
    Views: { [_ in never]: never };
    Functions: {
      import_students: { Args: { p_rows: Json; p_attested: boolean }; Returns: Json };
      issue_access_code: { Args: { p_subject_type: SubjectType; p_subject_id: string; p_code_hmac: string }; Returns: undefined };
      approve_join_request: { Args: { p_request_id: string; p_group_id: string | null }; Returns: string };
      confirm_consent: { Args: { p_student_id: string }; Returns: undefined };
      reorder: { Args: { p_table: string; p_ids: string[] }; Returns: undefined };
      hit_rate_limit: { Args: { p_key: string; p_window_seconds: number; p_max: number }; Returns: boolean };
      purge_rate_limits: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: {
      user_role: UserRole;
      edition: Edition;
      venue: Venue;
      gender: Gender;
      student_status: StudentStatus;
      subject_type: SubjectType;
      domain: DomainEnum;
      join_status: JoinStatus;
      consent_kind: ConsentKind;
      consent_method: ConsentMethod;
      message_status: MessageStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
