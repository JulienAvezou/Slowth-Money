import { z } from "zod";
import { DEFAULT_OLLAMA_BASE_URL, DEFAULT_OLLAMA_MODEL } from "../constants/policies";

export const settingsSchema = z.object({
  ollamaBaseUrl: z.url().refine((url) => {
    const hostname = new URL(url).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  }, "Ollama must use a loopback URL so private context stays local."),
  ollamaModel: z.string().min(1).max(120),
  serpApiKey: z.string().max(500),
  notifications: z.object({
    opportunities: z.boolean(),
    promotionExpiry: z.boolean(),
    ruleChanges: z.boolean(),
    behindGoal: z.boolean(),
    meaningfulProgress: z.boolean(),
    milestones: z.boolean(),
    aheadOfPlan: z.boolean(),
  }),
});

export type AppSettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: AppSettings = {
  ollamaBaseUrl: DEFAULT_OLLAMA_BASE_URL,
  ollamaModel: DEFAULT_OLLAMA_MODEL,
  serpApiKey: "",
  notifications: {
    opportunities: true,
    promotionExpiry: true,
    ruleChanges: true,
    behindGoal: true,
    meaningfulProgress: true,
    milestones: true,
    aheadOfPlan: true,
  },
};
