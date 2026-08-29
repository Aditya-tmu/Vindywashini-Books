import { IRepositoryContainer } from '../interfaces';
import { MongoCompanyRepository } from './MongoCompanyRepository';
import { MongoGroupRepository } from './MongoGroupRepository';
import { MongoLedgerRepository } from './MongoLedgerRepository';
import { MongoPartyRepository } from './MongoPartyRepository';
import { MongoItemRepository } from './MongoItemRepository';
import { MongoVoucherRepository } from './MongoVoucherRepository';
import { MongoInvoiceRepository } from './MongoInvoiceRepository';
import { MongoPurchaseBillRepository } from './MongoPurchaseBillRepository';
import { MongoSettingsRepository } from './MongoSettingsRepository';

export * from './MongoCompanyRepository';
export * from './MongoGroupRepository';
export * from './MongoLedgerRepository';
export * from './MongoPartyRepository';
export * from './MongoItemRepository';
export * from './MongoVoucherRepository';
export * from './MongoInvoiceRepository';
export * from './MongoPurchaseBillRepository';
export * from './MongoSettingsRepository';

export const createMongoRepositories = (): IRepositoryContainer => {
  return {
    companies: new MongoCompanyRepository(),
    groups: new MongoGroupRepository(),
    ledgers: new MongoLedgerRepository(),
    parties: new MongoPartyRepository(),
    items: new MongoItemRepository(),
    vouchers: new MongoVoucherRepository(),
    invoices: new MongoInvoiceRepository(),
    purchases: new MongoPurchaseBillRepository(),
    settings: new MongoSettingsRepository(),
  };
};
