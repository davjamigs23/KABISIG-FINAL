try {
  const { supabaseAdmin } = await import('./dist/services/supabase.service.js');
  const result = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
  console.dir(result, { depth: null });
  if (result.error) process.exitCode = 1;
} catch (error) {
  console.error('listUsers threw:', error);
  process.exitCode = 1;
}
