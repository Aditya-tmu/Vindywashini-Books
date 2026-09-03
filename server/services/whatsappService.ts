import axios from 'axios';
import { getRepositories } from '../repositories/factory';
import { IInvoice } from '../models/Invoice';

export class WhatsAppService {
  /**
   * Format Greeting Message from template
   */
  public static formatGreeting(
    template: string,
    invoice: any,
    company: CompanyInfo
  ): string {
    const defaultTemplate = invoice.signedUrl
      ? 'Dear {CustomerName}, thank you for shopping with {CompanyName}! Your invoice #{InvoiceNo} dated {Date} — Total ₹{Amount} — is ready.\n\n📄 Download Invoice PDF: {SignedURL}\n\nWe appreciate your business!'
      : 'Dear {CustomerName}, thank you for shopping with {CompanyName}! Please find your invoice #{InvoiceNo} dated {Date} attached. Total: ₹{Amount}. We appreciate your business!';

    let formatted = (template || defaultTemplate)
      .replace(/{CustomerName}/g, invoice.customerName || 'Valued Customer')
      .replace(/{CompanyName}/g, company.tradeName || company.legalName || 'Our Store')
      .replace(/{InvoiceNo}/g, invoice.invoiceNumber)
      .replace(/{Date}/g, new Date(invoice.date).toLocaleDateString('en-IN'))
      .replace(/{Amount}/g, invoice.grandTotal.toFixed(2))
      .replace(/{SignedURL}/g, invoice.signedUrl || '')
      .replace(/{InvoiceLink}/g, invoice.signedUrl || '');

    // If template did not have {SignedURL} placeholder but a signed URL is present and not yet in message, append it nicely
    if (invoice.signedUrl && !formatted.includes(invoice.signedUrl)) {
      formatted += `\n\n📄 Download Invoice PDF: ${invoice.signedUrl}`;
    }

    return formatted;
  }

  /**
   * Generate wa.me deep link (Zero-setup instant fallback)
   */
  public static generateWaMeLink(
    phone: string,
    message: string
  ): { link: string; cleanPhone: string } {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 10) {
      clean = '91' + clean;
    }
    const encoded = encodeURIComponent(message);
    return {
      link: `https://wa.me/${clean}?text=${encoded}`,
      cleanPhone: clean,
    };
  }

  /**
   * Send WhatsApp message via Meta Cloud API
   */
  public static async sendViaCloudApi(
    invoice: IInvoice,
    companyId: string,
    customPhone?: string,
    customMessage?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const repos = getRepositories();
    const [settings, company] = await Promise.all([
      repos.settings.getSettings(companyId),
      repos.companies.findById(companyId),
    ]);

    if (!settings || !settings.whatsapp || !settings.whatsapp.accessToken || !settings.whatsapp.phoneNumberId) {
      return {
        success: false,
        error: 'WhatsApp Cloud API is not configured. Please enter Access Token & Phone Number ID in Settings.',
      };
    }

    const phone = customPhone || invoice.customerPhone;
    if (!phone) {
      return { success: false, error: 'Customer mobile number is required for WhatsApp delivery.' };
    }

    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    const greeting =
      customMessage ||
      this.formatGreeting(settings.whatsapp?.defaultGreetingTemplate || '', invoice, {
        tradeName: company?.tradeName,
        legalName: company?.legalName,
      });

    try {
      const url = `https://graph.facebook.com/v21.0/${settings.whatsapp.phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: greeting,
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${settings.whatsapp.accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      const messageId = response.data?.messages?.[0]?.id;
      return { success: true, messageId };
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to send WhatsApp message via Meta Cloud API';
      return { success: false, error: errorMessage };
    }
  }
}

interface CompanyInfo {
  tradeName?: string;
  legalName?: string;
}
