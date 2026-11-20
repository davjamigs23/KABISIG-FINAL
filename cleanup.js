const { createClient } = require('./backend/node_modules/@supabase/supabase-js');
require('./backend/node_modules/dotenv').config({ path: './backend/.env' });

async function cleanup() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env');
  }
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Fetching users...');
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, resident_profile!inner(birthdate)');

  if (error) throw error;

  const fakes = (users || []).filter(
    (user) => user.resident_profile?.birthdate === '2000-01-01'
  );
  console.log(`Found ${fakes.length} fake accounts to delete.`);

  for (const fake of fakes) {
    const { error: authErr } = await supabase.auth.admin.deleteUser(fake.id);
    if (authErr) {
      console.log(`Failed to delete ${fake.email}: ${authErr.message}`);
    } else {
      console.log(`Deleted ${fake.email}`);
    }
  }
  console.log('Cleanup complete!');
}

cleanup().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
