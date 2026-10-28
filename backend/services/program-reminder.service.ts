import { supabaseAdmin } from './supabase.service.js';

export async function checkProgramReminders() {
  try {
    const today = new Date();
    const next7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const next1Day = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);
    
    const { data: programs } = await supabaseAdmin.from('program').select('*').in('status', ['upcoming', 'ongoing']);
    if (!programs) return;

    for (const prog of programs) {
      const start = new Date(prog.start_date);
      let daysLeft = 0;
      if (start.toDateString() === next7Days.toDateString()) daysLeft = 7;
      else if (start.toDateString() === next3Days.toDateString()) daysLeft = 3;
      else if (start.toDateString() === next1Day.toDateString()) daysLeft = 1;

      if (daysLeft > 0) {
        const { data: regs } = await supabaseAdmin.from('program_registrations').select('user_id').eq('program_id', prog.id);
        const { data: officials } = await supabaseAdmin.from('users').select('id').eq('tenant_id', prog.tenant_id).in('role_id', [2, 3]);
        
        const userIds = [...(regs?.map(r => r.user_id) || []), ...(officials?.map(o => o.id) || [])];
        
        const notifications = userIds.map(uid => ({
          user_id: uid,
          tenant_id: prog.tenant_id,
          title: `${daysLeft} Day Reminder: ${prog.title}`,
          message: `The program "${prog.title}" starts in ${daysLeft} days at ${prog.location}.`,
          notification_type: `PROGRAM_REMINDER_${prog.id}_${daysLeft}D`,
          is_read: false
        }));

        if (notifications.length > 0) {
          await supabaseAdmin.from('notifications').insert(notifications);
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