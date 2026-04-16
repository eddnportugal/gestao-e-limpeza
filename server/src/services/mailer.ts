import nodemailer from 'nodemailer';

const DATA_URL_PATTERN = /data:(.*?);base64,(.*)$/;

type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

type SendMailParams = {
  to: string;
  subject: string;
  html: string;
  attachments?: MailAttachment[];
};

let transporter: nodemailer.Transporter | null = null;

function getSmtpConfig() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number.parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;
  const fromName = process.env.SMTP_FROM_NAME || 'Gestão e Limpeza';

  return { host, port, secure, user, pass, fromEmail, fromName };
}

export function isMailerConfigured(): boolean {
  const { user, pass, fromEmail } = getSmtpConfig();
  return Boolean(user && pass && fromEmail);
}

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const { host, port, secure, user, pass } = getSmtpConfig();
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

export async function sendMail(params: SendMailParams): Promise<void> {
  if (!isMailerConfigured()) {
    throw new Error('Google SMTP não configurado no backend.');
  }

  const { fromEmail, fromName } = getSmtpConfig();
  await getTransporter().sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments,
  });
}

export function dataUrlToAttachment(dataUrl: string, filename: string): MailAttachment {
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) {
    throw new Error('Anexo em formato inválido.');
  }

  const [, contentType, base64] = match;
  return {
    filename,
    content: Buffer.from(base64, 'base64'),
    contentType,
  };
}