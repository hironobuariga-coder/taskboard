// src/supabaseClient.js
// ─────────────────────────────────────────────────────────────
// Supabase クライアント初期化
// .env.local に以下を設定してください：
//   VITE_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=sb_publishable_xxxx...（Publishable key）
// ─────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured =
  supabaseUrl && supabaseKey &&
  supabaseUrl !== 'undefined' && supabaseKey !== 'undefined' &&
  supabaseUrl.startsWith('https://');

// 未設定時はnullを返す（エラーは投げない → オフラインで動き続ける）
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const sbEnabled = isConfigured;
