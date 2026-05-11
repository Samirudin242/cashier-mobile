import { createClient } from "@supabase/supabase-js";

/** PROD */
const SUPABASE_URL = "https://urjlminyaqridshrfulx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4rp_vrehJWLXhHEwvbD4ug_AOtTUowh";

/** DEV */
// const SUPABASE_URL = "https://krlekpjtuhsyellktpfz.supabase.co";
// const SUPABASE_ANON_KEY = "sb_publishable_E9lWsO0VBQ-oINUaqr1ayw_ZE95G34c";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
