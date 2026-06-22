import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL || "";
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const sbEnabled = Boolean(URL && KEY && !URL.includes("YOUR_PROJECT"));
export const supabase  = sbEnabled ? createClient(URL, KEY) : null;

export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function signIn(email, password) {
  if (!supabase) return { error: { message: "Supabase未設定" } };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signUp(email, password) {
  if (!supabase) return { error: { message: "Supabase未設定" } };
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function onAuthChange(cb) {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}
