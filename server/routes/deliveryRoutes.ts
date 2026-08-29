import { Router } from 'express';
import { getRepositories } from '../repositories/factory';
import { EmailService } from '../services/emailService';
import { WhatsAppService } from '../services/whatsappService';
import { StorageService } from '../services/storageService';

const router = Router();

/**
 * POST /api/delivery/email - Send invoice by Email
 */
router.post('/email', async (req, res) => {
  try {
    const { invoiceId, companyId, recipientEmail, message } = req.body;
    if (!invoiceId || !companyId) {
      return res.status(400).json({ success: false, error: 'invoiceId and companyId are required' });
    }

    const repos = getRepositories();
    let invoice = await repos.invoices.findById(invoiceId);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const company = await repos.companies.findById(companyId);
    const settings = await repos.settings.getSettings(companyId);

    // If storage is configured, ensure fresh signed URL is available
    if (StorageService.isConfigured(settings)) {
      try {
        const linkRes = await StorageService.getOrRefreshSignedUrl(invoice, company, settings);
        if (linkRes.signedUrl && linkRes.isFresh) {
          const fresh = await repos.invoices.update(invoice._id, {
            signedUrl: linkRes.signedUrl,
            signedUrlExpiresAt: linkRes.expiresAt,
            cloudUploadStatus: 'uploaded',
          });
          if (fresh) invoice = fresh;
        }
      } catch (stErr: any) {
        console.warn('[DeliveryRoutes] Signed URL check notice:', stErr.message);
      }
    }

    const result = await EmailService.sendInvoiceEmail(
      invoice as any,
      companyId,
      recipientEmail,
      message
    );

    // Record delivery attempt in invoice audit log
    const deliveries = (invoice as any).deliveries || [];
    deliveries.push({
      channel: 'email',
      sentAt: new Date(),
      status: result.success ? 'success' : 'failed',
      recipient: recipientEmail || invoice.customerEmail || 'unknown',
      messageId: result.messageId,
      error: result.error,
    });
    await repos.invoices.update(invoice._id, { deliveries } as any);

    if (result.success) {
      res.json({
        success: true,
        message: 'Email sent successfully!',
        messageId: result.messageId,
        signedUrl: invoice.signedUrl,
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/delivery/whatsapp - Send invoice via WhatsApp (Cloud API or Fallback link)
 */
router.post('/whatsapp', async (req, res) => {
  try {
    const { invoiceId, companyId, recipientPhone, message, forceFallback } = req.body;
    if (!invoiceId || !companyId) {
      return res.status(400).json({ success: false, error: 'invoiceId and companyId are required' });
    }

    const repos = getRepositories();
    let invoice = await repos.invoices.findById(invoiceId);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const company = await repos.companies.findById(companyId);
    const settings = await repos.settings.getSettings(companyId);

    const phone = recipientPhone || invoice.customerPhone;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Customer phone number is missing' });
    }

    // If storage is configured, ensure fresh signed URL is available before formatting message
    if (StorageService.isConfigured(settings)) {
      try {
        const linkRes = await StorageService.getOrRefreshSignedUrl(invoice, company, settings);
        if (linkRes.signedUrl && linkRes.isFresh) {
          const fresh = await repos.invoices.update(invoice._id, {
            signedUrl: linkRes.signedUrl,
            signedUrlExpiresAt: linkRes.expiresAt,
            cloudUploadStatus: 'uploaded',
          });
          if (fresh) invoice = fresh;
        }
      } catch (stErr: any) {
        console.warn('[DeliveryRoutes] Storage signed URL notice:', stErr.message);
      }
    }

    const formattedMessage =
      message ||
      WhatsAppService.formatGreeting(
        settings?.whatsapp?.defaultGreetingTemplate || '',
        invoice as any,
        {
          tradeName: company?.tradeName,
          legalName: company?.legalName,
        }
      );

    const mode = forceFallback ? 'fallback' : settings?.whatsapp?.mode || 'fallback';
    const deliveries = (invoice as any).deliveries || [];

    if (mode === 'cloud_api') {
      const result = await WhatsAppService.sendViaCloudApi(
        invoice as any,
        companyId,
        recipientPhone,
        formattedMessage
      );

      deliveries.push({
        channel: 'whatsapp',
        sentAt: new Date(),
        status: result.success ? 'success' : 'failed',
        recipient: phone,
        messageId: result.messageId,
        error: result.error,
      });
      await repos.invoices.update(invoice._id, { deliveries } as any);

      if (result.success) {
        return res.json({
          success: true,
          mode: 'cloud_api',
          message: 'WhatsApp message sent successfully via Meta Cloud API!',
          messageId: result.messageId,
          signedUrl: invoice.signedUrl,
        });
      } else {
        return res.status(400).json({ success: false, error: result.error });
      }
    } else {
      // Fallback wa.me link
      const waLinkObj = WhatsAppService.generateWaMeLink(phone, formattedMessage);

      deliveries.push({
        channel: 'whatsapp',
        sentAt: new Date(),
        status: 'manual_fallback_opened',
        recipient: phone,
      });
      await repos.invoices.update(invoice._id, { deliveries } as any);

      return res.json({
        success: true,
        mode: 'fallback',
        waLink: waLinkObj.link,
        phone: waLinkObj.cleanPhone,
        message: formattedMessage,
        pdfPath: invoice.pdfPath,
        signedUrl: invoice.signedUrl,
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/delivery/whatsapp/link - Generate wa.me deep link
 */
router.post('/whatsapp/link', async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'Phone is required' });

    const linkObj = WhatsAppService.generateWaMeLink(phone, message || '');
    res.json({ success: true, ...linkObj });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
