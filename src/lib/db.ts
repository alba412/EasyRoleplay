import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prismaクライアント。
 *
 * DBはカード一覧・検索のインデックスだけを持つ。カード本体はPNGが正。
 * 接続先は prisma7.config.ts と同じ既定値を使う（実装順序7でPostgresへ移行する）。
 */

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: DATABASE_URL }),
  });
}

// 開発時のホットリロードで接続が増え続けないように使い回す
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
