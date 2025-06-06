export interface TOrganization {
    id: number;
    created_at: string;
    organizationName: string;
    organizationSlug: string;
    subscriptionPlan: string;
    subscritionStartDate: string;
    subscriptionEndDate: string;
    organizationOwner: string;
    organizationAlias: string;
    BillingAddress: string;
    TaxID: string;
    payoutAccountDetails: IPayoutAccountDetails | null;
    organizationOwnerId: number;
    organizationType: string;
    organizationLogo: string;
    favicon: string;
    country: string;
    eventPhoneNumber: string;
    eventWhatsApp: string;
    eventContactEmail: string;
    x: string;
    linkedIn: string;
    instagram: string;
    facebook: string;
    subDomain: string;
    certificateAsset: TCertificateAsset;
    organizationTeamMembers: TOrganizationTeamMember[];
    subscriptionExpiryDate: string;
  }
  
  export interface IPayoutAccountDetails {
    bankCountry: string;
    currency: string;
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankCode: string;
  }
  
  export type TOrganizationTeamMember = {
    userId: number;
    userEmail: string;
    userRole: string;
    workspaceAlias: string;
    id: number;
  };
  export interface TCertificateAsset {
    elements: string[];
    backgrounds: string[];
  }
  