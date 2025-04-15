import { UserSchema } from "@/schemas/user";
import { z } from "zod";

export type TUser = z.infer<typeof UserSchema> & {
    id: number;
    referralCode: string;
  };
  

  type User = {
    email: string;
    created_at: string;
    email_confirmed_at: string;
    id: string;
  };
  export interface TAuthUser {
    user: User;
  }
  export interface PaymentConfigProps {
    email: string;
    amount?: number;
    reference: string;
    currency?: string;
  }

  export interface ISubscription {
    id: number;
    created_at: string;
    userId: number;
    organizationId: number;
    subscriptionType: string;
    amountPayed: number;
    startDate: string;
    expirationDate: string;
    discountCode: string;
    discountValue: number;
    currency: string;
    monthYear: string;
    user: TUser;
    planPrice: number;
    organizationAlias: string;
  }
  