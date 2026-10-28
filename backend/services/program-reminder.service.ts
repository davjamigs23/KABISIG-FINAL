import { supabaseAdmin } from './supabase.service.js';

export async function checkProgramReminders() {
  try {
    const today = new Date();
    
    // Target dates for 7, 3, and 1 day from now
    const targets = [
      { days: 7, date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) },
      { days: 3, date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000) },
      { days: 1, date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000) },
    ];

    // Get all active programs
    const { data: programs } = await supabaseAdmin
      .from('program')
      .select('*')
      .in('status', ['upcoming', 'ongoing']);

    if (!programs || programs.length === 0) return;

    for (const prog of programs) {
      const start = new Date(prog.start_date);
      
      // Check if the program starts on one of our target dates
      const target = targets.find(t => start.toDateString() === t.date.toDateString());
      if (!target) continue; // Skip if not a 7-3-1 day

      // Get registered youths
      const { data: regs } = await supabaseAdmin
        .from('program_registrations')
        .select('user_id')
        .eq('program_id', prog.id);

      // Get SK Officials (Chairperson, Kagawad, Secretary, Treasurer)
      const { data: officials } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('tenant_id', prog.tenant_id)
        .in('role_id', [2, 3]); // Role 2 = Chair, Role 3 = Officials

      const userIds = [
        ...(regs?.map(r => r.user_id) || []),
        ...(officials?.map(o => o.id) || [])
      ];

      // Use unique user IDs
      const uniqueUserIds = [...new Set(userIds)];
      
      // Create the notification type string for this specific day
      const nType = `PROGRAM_REMINDER_${prog.id}_${prog.start_date.split('T')[0]}_${target.days}D`;

      for (const uid of uniqueUserIds) {
        // Check if this notification already exists to prevent duplicates
        const { data: existing } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('user_id', uid)
          .eq('notification_type', nType)
          .maybeSingle();

        if (!existing) {
          await supabaseAdmin.from('notifications').insert({
            user_id: uid,
            tenant_id: prog.tenant_id,
            title: `${prog.title.trim()} is coming up`,
            message: `The program "${prog.title.trim()}" starts in ${target.days} days at ${prog.location}.`,
            notification_type: nType,
            is_read: false
          });
        }
      }
    }
  } catch (err) {
    console.error('Reminder Scheduler Error:', err);
  }
}

export function startProgramReminderScheduler() {
  checkProgramReminders();
  setInterval(checkProgramReminders, 24 * 60 * 60 * 1000); // Run every 24 hours
}