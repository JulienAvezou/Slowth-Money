import { z } from "zod";

export const advisorMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4_000),
  })
  .strict();

export const advisorConversationSchema = z.array(advisorMessageSchema).min(1).max(12);

export const modelAdvisorReplySchema = z
  .object({
    answer: z.string().trim().min(1).max(8_000),
    assumptions: z.array(z.string().trim().min(1).max(300)).max(10),
    uncertainties: z.array(z.string().trim().min(1).max(300)).max(10),
    referencedProductIds: z.array(z.string().trim().min(1).max(160)).max(10),
    suggestedPrompts: z.array(z.string().trim().min(1).max(180)).max(4),
  })
  .strict();

export type AdvisorMessage = z.infer<typeof advisorMessageSchema>;
export type AdvisorReply = z.infer<typeof modelAdvisorReplySchema>;

export function parseAdvisorReply(
  response: string,
  availableProductIds: ReadonlySet<string>,
): AdvisorReply {
  let decoded: unknown;
  try {
    decoded = JSON.parse(response) as unknown;
  } catch {
    throw new Error("The local model returned an unreadable response. Please try again.");
  }

  const parsed = modelAdvisorReplySchema.safeParse(decoded);
  if (!parsed.success) {
    throw new Error("The local model returned an invalid response. Please try again.");
  }

  const unknownReferences = parsed.data.referencedProductIds.filter(
    (id) => !availableProductIds.has(id),
  );
  const uncertainties = [...parsed.data.uncertainties];
  if (unknownReferences.length > 0 && uncertainties.length < 10) {
    uncertainties.push(
      "One or more offer references could not be matched to the local cache and were omitted.",
    );
  }

  return {
    ...parsed.data,
    referencedProductIds: parsed.data.referencedProductIds.filter((id) =>
      availableProductIds.has(id),
    ),
    uncertainties,
  };
}
