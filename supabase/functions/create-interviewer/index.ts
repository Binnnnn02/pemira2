import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: cors });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return respond(405, { error: "Method tidak diizinkan." });
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return respond(500, { error: "Konfigurasi server belum lengkap." });
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return respond(401, { error: "Autentikasi diperlukan." });
  const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return respond(401, { error: "Sesi tidak valid." });
  const { data: profile, error: profileError } = await caller.from("profiles").select("role,is_active").eq("id", userData.user.id).single();
  if (profileError || profile?.role !== "admin" || profile?.is_active !== true) return respond(403, { error: "Hanya admin aktif yang dapat membuat akun pewawancara." });
  let body: { name?: string; email?: string; password?: string };
  try { body = await req.json(); } catch { return respond(400, { error: "Format request tidak valid." }); }
  const name = body.name?.trim(); const email = body.email?.trim().toLowerCase(); const password = body.password ?? "";
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) return respond(400, { error: "Nama, email valid, dan password minimal 8 karakter wajib diisi." });
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, role: "interviewer" } });
  if (createError || !created.user) return respond(400, { error: createError?.message ?? "Gagal membuat akun." });
  const { data: createdProfile, error: insertError } = await admin.from("profiles").insert({ id: created.user.id, email, name, role: "interviewer", is_active: true }).select("*").single();
  if (insertError || !createdProfile) {
    await admin.auth.admin.deleteUser(created.user.id);
    return respond(500, { error: "Gagal membuat profil pewawancara. Akun Auth dibatalkan." });
  }
  return respond(200, { profile: createdProfile });
});
