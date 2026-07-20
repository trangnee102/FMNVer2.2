import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Dán trực tiếp link vào đây, không qua .env nữa!
    url: "sqlserver://127.0.0.1:1433;database=FMN_DB_V2;integratedSecurity=true;trustServerCertificate=true;",
  },
});
