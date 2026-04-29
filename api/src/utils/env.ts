import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(8080),
    HOST: z.string().default("0.0.0.0"),
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url().optional(),
    JWT_SECRET: z.string().min(16, "JWT_SECRET should be at least 16 characters long"),
    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().default(30),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
    ACCESS_TOKEN_COOKIE_NAME: z.string().default("auth-token"),
    COOKIE_DOMAIN: z.string().optional(),
    COOKIE_SECURE: z.coerce.boolean().default(true),
    COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
    JWT_ISSUER: z.string().default("e-assessment-api"),
    JWT_AUDIENCE: z.string().optional(),
    CORS_ORIGIN: z.string().default("*"),
    GCP_BUCKET_NAME: z.string().optional(),
    MAX_UPLOAD_SIZE: z.coerce.number().default(5 * 1024 * 1024),
    TRUST_PROXY: z.coerce.boolean().default(false),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment configuration", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
