import { config } from '../config';

/**
 * Envoi d'e-mails. Version de développement : écrit dans la console.
 * En production, brancher ici nodemailer / Resend / SendGrid.
 */
export async function sendMail(to: string, subject: string, text: string) {
  if (config.NODE_ENV !== 'test') {
    console.log(`\n📧 [mail → ${to}] ${subject}\n${text}\n`);
  }
}
