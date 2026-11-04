/** Mail delivery behind an interface. Console transport locally; swap for SMTP or an API provider in production. */
export interface Mail { to: string; subject: string; text: string }
export interface Mailer { send(m: Mail): Promise<void> }
export class ConsoleMailer implements Mailer { constructor(private log: (m: string) => void) {} async send(m: Mail) { this.log(`MAIL to ${m.to}: ${m.subject}\n${m.text}`); } }
export class MemoryMailer implements Mailer { sent: Mail[] = []; async send(m: Mail) { this.sent.push(m); } }
export function createMailer(transport: string, log: (m: string) => void): Mailer { if (transport === "memory") return new MemoryMailer(); return new ConsoleMailer(log); }
