import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // ローカル専用なので既定値を直接持たせる。
    // Postgresへ移行するとき（実装順序7）に環境変数だけの指定へ寄せる。
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
});
