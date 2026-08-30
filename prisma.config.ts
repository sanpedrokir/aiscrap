import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local not present - rely on real environment variables (e.g. Amplify)
}

export default defineConfig({
  datasource: {
    // Falls back to a placeholder so `prisma generate` (client type generation,
    // which needs no live connection) still works before DATABASE_URL is set.
    // `db push` / `migrate` will fail clearly if this placeholder is actually used.
    url: process.env.DATABASE_URL ?? "postgresql://placeholder/placeholder",
  },
});
