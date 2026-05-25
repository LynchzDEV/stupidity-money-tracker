import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// In Docker, DATABASE_URL is already in process.env — skip file loading.
// Locally, load from .env files.
if (!process.env.DATABASE_URL) {
  loadEnvConfig(process.cwd());
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
