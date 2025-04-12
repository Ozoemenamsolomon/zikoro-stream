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