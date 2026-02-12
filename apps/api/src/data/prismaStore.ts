/**
 * Prisma store implementation placeholder.
 *
 * This file intentionally defines a migration target for production usage.
 * The current implementation uses MemoryStore for local development/tests,
 * while the schema in ../prisma/schema.prisma captures the required models.
 */

export class PrismaStoreNotImplementedError extends Error {
  constructor() {
    super("PrismaStore is not wired yet. Run Prisma generate/migrations and implement repository bindings.");
  }
}
