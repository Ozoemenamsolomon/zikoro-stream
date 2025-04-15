import { z } from "zod";

export const organizationSchema = z.object({
    organizationName: z
      .string()
      .min(1, { message: "Organisation name is required" }),
    organizationType: z
      .string()
      .min(1, { message: "Organisation type is required" }),
    subscriptionPlan: z
      .string()
      .min(1, { message: "Subscription plan is required" }),
    userEmail: z.string(),
    lastName: z.string(),
    firstName: z.string(),
    organizationAlias: z.string(),
  });
  