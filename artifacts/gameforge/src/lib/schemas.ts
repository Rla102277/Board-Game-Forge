import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  gameType: z.string().optional(),
  genre: z.string().optional(),
  playerCount: z.string().optional(),
  targetDuration: z.string().optional(),
});

export type CreateProjectValues = z.infer<typeof createProjectSchema>;
