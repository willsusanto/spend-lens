import * as z from 'zod';
import 'dotenv/config';

const createEnv = () => {
  const EnvSchema = z.object({
    APP_URL: z.string().optional().default('http://localhost:3000'),
    OLLAMA_ENDPOINT: z
      .string()
      .optional()
      .default('http://localhost:11434'),
    OLLAMA_MODEL: z.string().optional().default('llama3.1'),
    DATABASE_URL: z.string().optional().default('file:./data/ledgerlocal.db'),
  });

  const envVars = {
    APP_URL: process.env.NEXT_PUBLIC_URL,
    OLLAMA_ENDPOINT: process.env.OLLAMA_ENDPOINT,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL,
    DATABASE_URL: process.env.DATABASE_URL,
  };

  const parsedEnv = EnvSchema.safeParse(envVars);

  if (!parsedEnv.success) {
    throw new Error(
      `Invalid env provided.
  The following variables are missing or invalid:
  ${Object.entries(parsedEnv.error.flatten().fieldErrors)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')}
  `,
    );
  }

  return parsedEnv.data ?? {};
};

export const env = createEnv();
