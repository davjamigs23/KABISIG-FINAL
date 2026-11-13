export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) {
    throw new Error('Brevo email configuration is missing BREVO_API_KEY or BREVO_SENDER_EMAIL.');
  }

  let response: Response;
  try {
    response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'KABISIG', email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
  } catch (error) {
    console.error('[EMAIL] Brevo request failed:', error);
    throw new Error(`Brevo request failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!response.ok) {
    const responseBody = await response.text().catch(() => '');
    let providerMessage = responseBody;
    try {
      const parsed = JSON.parse(responseBody);
      providerMessage = parsed.message || parsed.code || responseBody;
    } catch {
      // Keep the raw provider response when it is not JSON.
    }
    const errorMessage = `Brevo email request failed (${response.status}): ${providerMessage || response.statusText}`;
    console.error('[EMAIL]', errorMessage);
    throw new Error(errorMessage);
  }
}