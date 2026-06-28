import * as z from 'zod';
import 'dotenv/config';

const createEnv = () => {
  const EnvSchema = z.object({
    APP_URL: z.string().url().default('http://localhost:3000'),
    FINANCE_STORE_MODE: z
      .enum(['localStorage', 'database'])
      .default('localStorage'),
    OLLAMA_ENDPOINT: z.string().url().default('http://localhost:11434'),
    OLLAMA_MODEL: z.string().default('gemma4:12b'),
    DATABASE_URL: z.string().url().optional(),
  });

  const envVars = {
    APP_URL: process.env.NEXT_PUBLIC_URL,
    FINANCE_STORE_MODE: process.env.NEXT_PUBLIC_FINANCE_STORE_MODE,
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

  const env = parsedEnv.data;

  if (env.FINANCE_STORE_MODE === 'database' && !env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is required when NEXT_PUBLIC_FINANCE_STORE_MODE=database.',
    );
  }

  return env;
};

export const env = createEnv();
