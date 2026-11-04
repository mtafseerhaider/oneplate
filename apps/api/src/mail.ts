/** Mail delivery behind an interface. Console transport locally; swap for SMTP or an API provider in production. */
export interface Mail { to: string; subject: string; text: string }
export interface Mailer { send(m: Mail): Promise<void> }
export class ConsoleMailer implements Mailer { constructor(private log: (m: string) => void) {} async send(m: Mail) { this.log(`MAIL to ${m.to}: ${m.subject}\n${m.text}`); } }
export class MemoryMailer implements Mailer { sent: Mail[] = []; async send(m: Mail) { this.sent.push(m); } }
import nodemailer from "nodemailer";
/** SMTP via nodemailer. SMTP_URL like smtps://user:pass@smtp.example.com:465 or smtp://user:pass@host:587 (STARTTLS). */
export class SmtpMailer implements Mailer { private t: nodemailer.Transporter; constructor(url: string, private from: string) { this.t = nodemailer.createTransport(url); } async send(m: Mail) { await this.t.sendMail({ from: this.from, to: m.to, subject: m.subject, text: m.text }); } async verify() { await this.t.verify(); } }
export function createMailer(transport: string, log: (m: string) => void, opts: { smtpUrl?: string; from?: string } = {}): Mailer {
  if (transport === "memory") return new MemoryMailer();
  if (transport === "smtp") { if (!opts.smtpUrl) throw new Error("MAIL_TRANSPORT=smtp needs SMTP_URL"); return new SmtpMailer(opts.smtpUrl, opts.from ?? "OnePlate <no-reply@localhost>"); }
  return new ConsoleMailer(log);
}
