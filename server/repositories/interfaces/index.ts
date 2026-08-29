export * from './ICompanyRepository';
export * from './IGroupRepository';
export * from './ILedgerRepository';
export * from './IPartyRepository';
export * from './IItemRepository';
export * from './IVoucherRepository';
export * from './IInvoiceRepository';
export * from './IPurchaseBillRepository';
export * from './ISettingsRepository';

export interface IRepositoryContainer {
  companies: import('./ICompanyRepository').ICompanyRepository;
  groups: import('./IGroupRepository').IGroupRepository;
  ledgers: import('./ILedgerRepository').ILedgerRepository;
  parties: import('./IPartyRepository').IPartyRepository;
  items: import('./IItemRepository').IItemRepository;
  vouchers: import('./IVoucherRepository').IVoucherRepository;
  invoices: import('./IInvoiceRepository').IInvoiceRepository;
  purchases: import('./IPurchaseBillRepository').IPurchaseBillRepository;
  settings: import('./ISettingsRepository').ISettingsRepository;
}
