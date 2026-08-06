import { sendEmail, templates } from './utils/mailer';

export const sendTransactionEmail = async (userEmail: string, type: string, amount: number, status: string, reason?: string) => {
  const subject = `Transaction ${status}: ${type}`;
  const html = templates.transactionStatus(type, amount, status, reason);

  try {
    await sendEmail(userEmail, subject, html);
    console.log(`[EMAIL] Successfully sent ${status} transaction email to ${userEmail}`);
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send transaction email to ${userEmail}:`, error);
  }
};
