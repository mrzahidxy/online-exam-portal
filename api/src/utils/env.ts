import "dotenv/config";

import { z } from "zod";

const booleanFromEnv = (defaultValue: boolean) => z.preprocess((value) => {
    if (typeof value === "string") {
        if (value.toLowerCase() === "true") return true;
        if (value.toLowerCase() === "false") return false;
    }
    return value;
}, z.boolean().default(defaultValue));

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
    COOKIE_SECURE: booleanFromEnv(false),
    COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
    JWT_ISSUER: z.string().default("e-assessment-api"),
    JWT_AUDIENCE: z.string().optional(),
    CORS_ORIGIN: z.string().optional(),
    MAX_UPLOAD_SIZE: z.coerce.number().int().positive().default(50 * 1024 * 1024),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    CLOUDINARY_FOLDER: z.string().default("online-exam-portal"),
    TRUST_PROXY: booleanFromEnv(false),
}).superRefine((config, context) => {
    const origins = (config.CORS_ORIGIN ?? "http://localhost:3000")
        .split(",")
        .map((origin) => origin.trim());

    if (config.NODE_ENV === "production" && !config.CORS_ORIGIN?.trim()) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["CORS_ORIGIN"],
            message: "CORS_ORIGIN must list the allowed frontend origins in production",
        });
    }

    for (const origin of origins) {
        try {
            const parsedOrigin = new URL(origin);
            if (origin === "*" || parsedOrigin.origin !== origin || !["http:", "https:"].includes(parsedOrigin.protocol)) {
                throw new Error("Invalid origin");
            }
        } catch {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["CORS_ORIGIN"],
                message: "CORS_ORIGIN must contain comma-separated HTTP(S) origins without paths or wildcards",
            });
            break;
        }
    }

    if (config.NODE_ENV === "production" && !config.COOKIE_SECURE) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["COOKIE_SECURE"],
            message: "COOKIE_SECURE must be true in production",
        });
    }

    if (config.COOKIE_SAME_SITE === "none" && !config.COOKIE_SECURE) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["COOKIE_SAME_SITE"],
            message: "COOKIE_SAME_SITE=none requires COOKIE_SECURE=true",
        });
    }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment configuration", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
}

export const env = {
    ...parsed.data,
    CORS_ORIGIN: parsed.data.CORS_ORIGIN ?? "http://localhost:3000",
};
