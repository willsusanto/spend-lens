import * as z from 'zod';
import 'dotenv/config';

const createEnv = () => {
  const EnvSchema = z.object({
    APP_URL: z.string().url().default('http://localhost:3000'),
    FINANCE_STORE_MODE: z.enum(['database']).default('database'),
    OLLAMA_ENDPOINT: z.string().url().default('http://localhost:11434'),
    OLLAMA_MODEL: z.string().default('gemma4:12b'),
    DATABASE_URL: z.string().url(),
    HOSTED_MODE: z
      .preprocess((val) => val === 'true' || val === true, z.boolean())
      .default(false),
  });

  const envVars = {
    APP_URL: process.env.NEXT_PUBLIC_URL,
    FINANCE_STORE_MODE: process.env.NEXT_PUBLIC_FINANCE_STORE_MODE,
    OLLAMA_ENDPOINT: process.env.OLLAMA_ENDPOINT,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL,
    DATABASE_URL: process.env.DATABASE_URL,
    HOSTED_MODE: process.env.NEXT_PUBLIC_HOSTED_MODE,
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

  return parsedEnv.data;
};

export const env = createEnv();
