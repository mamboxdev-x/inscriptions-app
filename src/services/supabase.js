import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasPlaceholder = value => !value || /your-project|your-publishable|placeholder|example/i.test(value);

export const supabase = !hasPlaceholder(url) && !hasPlaceholder(anonKey) ? createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;

export const isConfigured = Boolean(supabase);
