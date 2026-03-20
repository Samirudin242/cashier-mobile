import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://urjlminyaqridshrfulx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4rp_vrehJWLXhHEwvbD4ug_AOtTUowh";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
