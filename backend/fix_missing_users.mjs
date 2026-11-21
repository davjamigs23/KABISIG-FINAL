import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function fixMissingUsers() {
  console.log("Fetching Auth users...");
  let page = 1;
  const allAuthUsers = [];
  
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) { console.error(error); return; }
    allAuthUsers.push(...data.users);
    if (data.users.length < 1000) break;
    page++;
  }

  console.log(`Found ${allAuthUsers.length} total Auth users.`);

  console.log("Fetching Public users...");
  const { data: publicUsers } = await supabase.from('users').select('id');
  const publicIds = new Set(publicUsers.map(u => u.id));

  const missingUsers = allAuthUsers.filter(u => !publicIds.has(u.id));
  console.log(`Found ${missingUsers.length} missing users in Public table.`);

  // Default Barangay ID (Change this to whatever default you prefer)
  const defaultTenantId = 'b0222222-2222-4000-8000-000000000022'; // San Francisco

  for (const user of missingUsers) {
    const email = user.email;
    const fullName = user.user_metadata?.full_name || email.split('@')[0];

    // 1. Insert into public.users
    const { error: userErr } = await supabase.from('users').insert({
      id: user.id,
      email: email,
      full_name: fullName,
      role_id: 4, // Youth Constituent
      status: 'active',
      tenant_id: defaultTenantId
    });

    if (userErr) {
      console.error(`Failed to insert ${email} into users:`, userErr.message);
      continue;
    }

    // 2. Insert into resident_profile
    const { error: profErr } = await supabase.from('resident_profile').insert({
      user_id: user.id,
      tenant_id: defaultTenantId,
      sex: 'Male', // Fallback
      birthdate: '2000-01-01', // Fallback
      address: 'Naga City', // Fallback
      verification_status: 'verified',
      is_registered_voter: true
    });

    if (profErr) {
      console.error(`Failed to insert profile for ${email}:`, profErr.message);
    } else {
      console.log(`✅ Restored missing user: ${email}`);
    }
  }
  console.log("Done!");
}

fixMissingUsers();