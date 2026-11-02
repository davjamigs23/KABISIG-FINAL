

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    if (!apiKey || !senderEmail) return;
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ sender: { name: 'KABISIG', email: senderEmail }, to: [{ email: to }], subject: subject, htmlContent: html })
    });
  } catch (err) { console.error('[EMAIL] ERROR:', err); }
}