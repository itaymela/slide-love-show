// External Supabase project used ONLY to read the `students` table for Sky Mode.
// This is independent of the primary Lovable Cloud backend.
import { createClient } from "@supabase/supabase-js";

const STUDENTS_SUPABASE_URL = "https://izhbghjfrlgdpqrhnful.supabase.co";
const STUDENTS_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6aGJnaGpmcmxnZHBxcmhuZnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mjc5NzgsImV4cCI6MjA5MjAwMzk3OH0.4PJyOxXKhW5LyRtqOJT6JIPoUBVkAvH_eZRo5kVVerA";

export type Student = {
  full_name: string;
  points: number;
};

export const studentsSupabase = createClient(STUDENTS_SUPABASE_URL, STUDENTS_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function fetchStudents(): Promise<Student[]> {
  const { data, error } = await studentsSupabase
    .from("students")
    .select("full_name, points");
  if (error) {
    console.error("[SkyMode] fetchStudents failed", error);
    return [];
  }
  return ((data as any[]) || [])
    .map((r) => ({
      full_name: String(r.full_name || "").trim(),
      points: Number(r.points) || 0,
    }))
    .filter((s) => s.full_name && s.points > 0);
}