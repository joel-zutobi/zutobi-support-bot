import * as z from "zod/v4";

const optionalText = z.string().nullable().optional();

export const lookupInputSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(3)
      .max(320)
      .optional()
      .describe("Exact Zutobi account email address"),
    user_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Numeric Zutobi user ID, called pk by the upstream API"),
  })
  .strict()
  .superRefine((value, context) => {
    const supplied = Number(value.email !== undefined) + Number(value.user_id !== undefined);
    if (supplied !== 1) {
      context.addIssue({
        code: "custom",
        message: "Provide exactly one of email or user_id",
      });
    }
  });

export const upstreamSubscriptionSchema = z
  .object({
    provider: z.string().min(1),
    end_date: optionalText,
  })
  .loose();

export const upstreamUserSchema = z
  .object({
    user_id: z.number().int().positive(),
    username: optionalText,
    first_name: optionalText,
    last_name: optionalText,
    email: z.string().min(1),
    user_type: optionalText,
    created_at: optionalText,
    active_subs: z.array(z.string()).default([]),
    subscription_details: z.array(upstreamSubscriptionSchema).default([]),
    subject_code_id: optionalText,
    course_code_id: optionalText,
    course: optionalText,
    country: optionalText,
    has_subscription: z.boolean(),
  })
  .loose();

export const upstreamResponseSchema = z
  .object({
    count: z.number().int().nonnegative(),
    results: z.array(upstreamUserSchema),
  })
  .loose();

export const normalizedUserSchema = z.object({
  user_id: z.number().int().positive(),
  account_email: z.string(),
  first_name: z.string().nullable(),
  user_type: z.string().nullable(),
  created_at: z.string().nullable(),
  has_subscription: z.boolean(),
  active_subscriptions: z.array(z.string()),
  subscription_details: z.array(
    z.object({
      provider: z.string(),
      end_date: z.string().nullable(),
    }),
  ),
  subject_code: z.string().nullable(),
  course_code: z.string().nullable(),
  course: z.string().nullable(),
  country: z.string().nullable(),
});

const responseMetadata = {
  source: z.literal("zutobi_admin_api"),
  retrieved_at: z.string(),
};

export const lookupResultSchema = z.discriminatedUnion("match", [
  z.object({
    match: z.literal("none"),
    count: z.literal(0),
    lookup_by: z.enum(["email", "user_id"]),
    ...responseMetadata,
  }),
  z.object({
    match: z.literal("single"),
    count: z.literal(1),
    lookup_by: z.enum(["email", "user_id"]),
    user: normalizedUserSchema,
    ...responseMetadata,
  }),
  z.object({
    match: z.literal("ambiguous"),
    count: z.number().int().min(2),
    lookup_by: z.enum(["email", "user_id"]),
    ...responseMetadata,
  }),
]);

export type LookupInput = z.infer<typeof lookupInputSchema>;
export type LookupResult = z.infer<typeof lookupResultSchema>;
export type UpstreamUser = z.infer<typeof upstreamUserSchema>;
