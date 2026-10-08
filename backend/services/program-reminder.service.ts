import { supabaseAdmin } from './supabase.service.js';

const reminderDays = [7, 3, 1] as const;
const millisecondsPerDay = 24 * 60 * 60 * 1000;
let schedulerStarted = false;

function toDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function getManilaDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export async function createUpcomingProgramReminders(now = new Date()): Promise<void> {
  const today = getManilaDate(now);
  const todayTimestamp = Date.parse(`${today}T00:00:00.000Z`);
  const queryStart = toDateString(todayTimestamp - millisecondsPerDay);
  const queryEnd = toDateString(todayTimestamp + 9 * millisecondsPerDay);
  const { data: programs, error: programsError } = await supabaseAdmin
    .from('program')
    .select('id, tenant_id, title, location, start_date')
    .in('status', ['upcoming', 'ongoing'])
    .gte('start_date', `${queryStart}T00:00:00.000Z`)
    .lt('start_date', `${queryEnd}T00:00:00.000Z`);

  if (programsError) {
    console.error('Failed to load programs for reminders:', programsError.message);
    return;
  }

  const upcomingPrograms = (programs || []).flatMap(program => {
    const programDate = getManilaDate(new Date(program.start_date));
    const programTimestamp = Date.parse(`${programDate}T00:00:00.000Z`);
    const daysUntil = Math.round((programTimestamp - todayTimestamp) / millisecondsPerDay);
    return reminderDays.includes(daysUntil as typeof reminderDays[number])
      ? [{ ...program, programDate, daysUntil }]
      : [];
  });

  if (upcomingPrograms.length === 0) return;

  const tenantIds = [...new Set(upcomingPrograms.map(program => program.tenant_id))];
  const { data: recipients, error: recipientsError } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id')
    .in('tenant_id', tenantIds)
    .in('role_id', [2, 3])
    .eq('status', 'active');

  if (recipientsError) {
    console.error('Failed to load program reminder recipients:', recipientsError.message);
    return;
  }

  for (const program of upcomingPrograms) {
    const recipientIds = (recipients || [])
      .filter(recipient => recipient.tenant_id === program.tenant_id)
      .map(recipient => recipient.id);
    if (recipientIds.length === 0) continue;

    const notificationType = `PROGRAM_REMINDER_${program.id}_${program.programDate}_${program.daysUntil}D`;
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('notifications')
      .select('user_id')
      .eq('tenant_id', program.tenant_id)
      .eq('notification_type', notificationType)
      .in('user_id', recipientIds);

    if (existingError) {
      console.error(`Failed to check reminders for program ${program.id}:`, existingError.message);
      continue;
    }

    const existingRecipients = new Set((existing || []).map(notification => notification.user_id));
    const startsOn = new Date(`${program.programDate}T12:00:00.000Z`).toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const notifications = recipientIds
      .filter(userId => !existingRecipients.has(userId))
      .map(userId => ({
        tenant_id: program.tenant_id,
        user_id: userId,
        notification_type: notificationType,
        title: `${program.title} is coming up`,
        message: `This event starts in ${program.daysUntil} ${program.daysUntil === 1 ? 'day' : 'days'} on ${startsOn}${program.location ? ` at ${program.location}` : ''}.`,
        link: '/calendar',
        is_read: false,
      }));

    if (notifications.length === 0) continue;

    const { error: insertError } = await supabaseAdmin.from('notifications').insert(notifications);
    if (insertError) {
      console.error(`Failed to create reminders for program ${program.id}:`, insertError.message);
    }
  }
}

export function startProgramReminderScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  let checkRunning = false;
  const checkReminders = async () => {
    if (checkRunning) return;
    checkRunning = true;
    try {
      await createUpcomingProgramReminders();
    } catch (error) {
      console.error('Program reminder check failed:', error);
    } finally {
      checkRunning = false;
    }
  };

  void checkReminders();
  const interval = setInterval(() => void checkReminders(), 60 * 60 * 1000);
  interval.unref();
}
