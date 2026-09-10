const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

function getSupabase() {
    if (supabase) return supabase;
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados no .env');
    }
    supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
    });
    return supabase;
}

module.exports = { getSupabase };
