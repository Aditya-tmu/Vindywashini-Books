const assert = require('assert');
const { StorageService } = require('../dist-server/services/storageService');
const { WhatsAppService } = require('../dist-server/services/whatsappService');

async function testStorageIntegration() {
  console.log('[TestStorage] Starting Storage & Delivery unit verification...');

  // 1. Check isConfigured helper
  const unconfiguredSettings = { storage: { enabled: false, supabaseUrl: '', serviceRoleKey: '', bucketName: '' } };
  assert.strictEqual(StorageService.isConfigured(unconfiguredSettings), false, 'Unconfigured settings should return false');

  const configuredSettings = {
    storage: {
      enabled: true,
      supabaseUrl: 'https://your-project-ref.supabase.co',
      serviceRoleKey: 'test-key-1234567890',
      bucketName: 'Vindywashini Book',
      signedUrlExpiryDays: 30,
      autoCleanupDays: 90,
    },
  };
  assert.strictEqual(StorageService.isConfigured(configuredSettings), true, 'Valid settings should return true');

  // 2. Test WhatsApp template variable formatting with {SignedURL}
  const dummyInvoice = {
    invoiceNumber: 'INV/2025/001',
    customerName: 'Test Buyer',
    customerPhone: '9876543210',
    date: '2026-08-17',
    grandTotal: 1500,
    signedUrl: 'https://your-project-ref.supabase.co/storage/v1/object/sign/invoices/INV_001.html?token=xyz',
  };

  const customTemplate =
    'Dear {CustomerName}, your bill #{InvoiceNo} of ₹{Amount} is ready. View invoice: {SignedURL}';
  const formatted = WhatsAppService.formatGreeting(customTemplate, dummyInvoice, { tradeName: 'Vindywashini Books' });

  assert(formatted.includes('Test Buyer'), 'Should contain customer name');
  assert(formatted.includes('INV/2025/001'), 'Should contain invoice number');
  assert(formatted.includes('₹1500.00'), 'Should contain formatted total');
  assert(
    formatted.includes('https://your-project-ref.supabase.co/storage/v1/object/sign/invoices/INV_001.html?token=xyz'),
    'Should contain signed URL'
  );

  // 3. Test default fallback greeting automatic URL appending
  const defaultTemplate =
    'Dear {CustomerName}, thank you for shopping with {CompanyName}! Please find your invoice #{InvoiceNo} dated {Date} attached. Total: ₹{Amount}. We appreciate your business!';
  const formattedDefault = WhatsAppService.formatGreeting(defaultTemplate, dummyInvoice, {
    tradeName: 'Vindywashini Books',
  });
  assert(formattedDefault.includes('View/Download Invoice:'), 'Should auto-append download link if not in template');
  assert(formattedDefault.includes('token=xyz'), 'Should contain signed download link');

  // 4. Test wa.me link generation with phone formatting
  const waLink = WhatsAppService.generateWaMeLink('9876543210', formattedDefault);
  assert.strictEqual(waLink.cleanPhone, '919876543210', 'Should prefix India country code 91');
  assert(waLink.link.startsWith('https://wa.me/919876543210?text='), 'Should create valid wa.me URI');

  console.log('[TestStorage] All Storage & Delivery tests passed successfully! ✅');
}

testStorageIntegration().catch((err) => {
  console.error('[TestStorage] Failed:', err);
  process.exit(1);
});
