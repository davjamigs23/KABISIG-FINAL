import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function reset() {
  const { data: users } = await supabase.from('users').select('id, email').in('role_id', [2, 3]);
  for (const user of users) {
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password: 'Kabisig2026!' });
    if (error) console.error(`Failed: ${user.email}`, error.message);
    else console.log(`✅ Reset: ${user.email}`);
  }
}
reset();