export interface IPartyEntity {
  _id: string;
  name: string;
  type: 'Customer' | 'Supplier';
  gstin?: string;
  pan?: string;
  phone?: string;
  email?: string;
  billingAddress: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    stateCode?: string;
    pincode?: string;
  };
  shippingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    stateCode?: string;
    pincode?: string;
  };
  placeOfSupply?: string;
  openingBalance: number;
  openingType: 'Dr' | 'Cr';
  currentBalance: number;
  creditLimit?: number;
  paymentTermsDays?: number;
  companyId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPartyRepository {
  findByCompany(companyId: string, type?: string): Promise<IPartyEntity[]>;
  findById(id: string): Promise<IPartyEntity | null>;
  findByName(companyId: string, name: string): Promise<IPartyEntity | null>;
  create(data: Partial<IPartyEntity>): Promise<IPartyEntity>;
  update(id: string, data: Partial<IPartyEntity>): Promise<IPartyEntity | null>;
  delete(id: string): Promise<boolean>;
  countByCompany(companyId: string): Promise<number>;
}
