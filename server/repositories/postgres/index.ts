import { IRepositoryContainer } from '../interfaces';
import { PostgresCompanyRepository } from './PostgresCompanyRepository';
import { PostgresGroupRepository } from './PostgresGroupRepository';
import { PostgresLedgerRepository } from './PostgresLedgerRepository';
import { PostgresPartyRepository } from './PostgresPartyRepository';
import { PostgresItemRepository } from './PostgresItemRepository';
import { PostgresVoucherRepository } from './PostgresVoucherRepository';
import { PostgresInvoiceRepository } from './PostgresInvoiceRepository';
import { PostgresPurchaseBillRepository } from './PostgresPurchaseBillRepository';
import { PostgresSettingsRepository } from './PostgresSettingsRepository';

export * from './postgresClient';
export * from './PostgresCompanyRepository';
export * from './PostgresGroupRepository';
export * from './PostgresLedgerRepository';
export * from './PostgresPartyRepository';
export * from './PostgresItemRepository';
export * from './PostgresVoucherRepository';
export * from './PostgresInvoiceRepository';
export * from './PostgresPurchaseBillRepository';
export * from './PostgresSettingsRepository';

export const createPostgresRepositories = (): IRepositoryContainer => {
  return {
    companies: new PostgresCompanyRepository(),
    groups: new PostgresGroupRepository(),
    ledgers: new PostgresLedgerRepository(),
    parties: new PostgresPartyRepository(),
    items: new PostgresItemRepository(),
    vouchers: new PostgresVoucherRepository(),
    invoices: new PostgresInvoiceRepository(),
    purchases: new PostgresPurchaseBillRepository(),
    settings: new PostgresSettingsRepository(),
  };
};
