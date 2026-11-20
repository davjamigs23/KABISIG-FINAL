import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config(); // Loads from backend/.env

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const usersToRestore = [
  {
    barangayName: 'Lerma',
    email: 'angiepujado@gmail.com',
    fullName: 'Ma. Angelica Pujado',
    phone: '09939925665',
    birthdate: '2000-12-28',
    sex: 'Female'
  },
  {
    barangayName: 'Cararayan',
    email: 'jbilbao@gbox.ncf.edu.ph',
    fullName: 'Jeffrey Villano Bilbao',
    phone: '09071406514',
    birthdate: '2000-10-09',
    sex: 'Male'
  }
];

async function restoreUsers() {
  for (const user of usersToRestore) {
    console.log(`\n--- Restoring ${user.fullName} (${user.barangayName}) ---`);
    
    const { data: barangay, error: bErr } = await supabase
      .from('barangay').select('id').eq('name', user.barangayName).single();
      
    if (bErr || !barangay) {
      console.error(`Could not find barangay: ${user.barangayName}`);
      continue;
    }

    // 1. Create Auth User
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: user.email,
      password: 'Kabisig2026!',
      email_confirm: true,
      user_metadata: { full_name: user.fullName }
    });

    if (authErr) {
      console.error(`Auth creation failed:`, authErr.message);
      continue; 
    }

    const userId = authData.user.id;
    console.log(`Auth User Created: ${userId}`);

    // 2. Insert Public User
    const { error: publicErr } = await supabase.from('users').insert({
      id: userId,
      email: user.email,
      full_name: user.fullName,
      phone: user.phone,
      role_id: 2, // Chairperson
      official_role: 'SK Chairperson',
      tenant_id: barangay.id,
      status: 'active',
      setup_completed: true
    });

    if (publicErr) {
      console.error(`Public User insert failed:`, publicErr.message);
      continue;
    }

    // 3. Insert Resident Profile
    const { error: profileErr } = await supabase.from('resident_profile').insert({
      user_id: userId,
      tenant_id: barangay.id,
      birthdate: user.birthdate,
      sex: user.sex,
      address: 'Naga City',
      verification_status: 'verified'
    });

    if (profileErr) {
      console.error(`Resident Profile insert failed:`, profileErr.message);
    } else {
      console.log(`✅ Successfully restored ${user.fullName}`);
    }
  }
}

restoreUsers();