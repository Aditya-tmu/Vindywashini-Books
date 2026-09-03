import nodemailer from 'nodemailer';
import { getRepositories } from '../repositories/factory';
import { IInvoice } from '../models/Invoice';
import fs from 'fs';

export class EmailService {
  /**
   * Test SMTP Connection
   */
  public static async testSMTP(config: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        connectionTimeout: 8000,
      });

      await transporter.verify();
      return { success: true, message: 'SMTP connection established successfully!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to connect to SMTP server' };
    }
  }

  /**
   * Send Invoice Email with optional HTML or PDF attachment
   */
  public static async sendInvoiceEmail(
    invoice: IInvoice,
    companyId: string,
    customRecipient?: string,
    customMessage?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const repos = getRepositories();
    const [settings, company] = await Promise.all([
      repos.settings.getSettings(companyId),
      repos.companies.findById(companyId),
    ]);

    if (!settings || !settings.smtp || !settings.smtp.enabled || !settings.smtp.user) {
      return {
        success: false,
        error: 'SMTP email is not configured or disabled in Settings.',
      };
    }

    const recipient = customRecipient || invoice.customerEmail;
    if (!recipient) {
      return {
        success: false,
        error: 'No customer email address provided for invoice.',
      };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: settings.smtp.host,
        port: settings.smtp.port,
        secure: settings.smtp.secure,
        auth: {
          user: settings.smtp.user,
          pass: settings.smtp.pass,
        },
      });

      const companyName = company?.tradeName || company?.legalName || 'Vindywashini Books';
      let greeting =
        customMessage ||
        `Dear ${invoice.customerName},\n\nThank you for shopping with ${companyName}! Please find your Tax Invoice #${invoice.invoiceNumber} dated ${new Date(
          invoice.date
        ).toLocaleDateString('en-IN')} attached.\n\nTotal Amount: ₹${invoice.grandTotal.toFixed(
          2
        )}\n\nWe appreciate your business!\n\nBest Regards,\n${companyName}`;

      if (invoice.signedUrl && !greeting.includes(invoice.signedUrl)) {
        greeting += `\n\n📄 Download Invoice PDF: ${invoice.signedUrl}`;
      }

      const attachments: any[] = [];
      if (invoice.pdfPath && fs.existsSync(invoice.pdfPath)) {
        const isPdf = invoice.pdfPath.toLowerCase().endsWith('.pdf');
        const ext = isPdf ? 'pdf' : 'html';
        attachments.push({
          filename: `Invoice_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`,
          path: invoice.pdfPath,
          contentType: isPdf ? 'application/pdf' : 'text/html',
        });
      }

      const info = await transporter.sendMail({
        from: `"${settings.smtp.fromName || companyName}" <${settings.smtp.fromEmail || settings.smtp.user}>`,
        to: recipient,
        subject: `Tax Invoice #${invoice.invoiceNumber} from ${companyName}`,
        text: greeting,
        attachments,
      });

      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error sending email' };
    }
  }
}
