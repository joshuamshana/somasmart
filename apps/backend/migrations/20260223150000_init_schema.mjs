/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE "ProjectLifecycleStatus" AS ENUM ('active', 'suspended', 'archived');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE "UserStatus" AS ENUM ('active', 'pending', 'suspended');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE "TenantRole" AS ENUM ('student', 'teacher', 'admin', 'school_admin');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE "PlatformJobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await knex.schema.createTable("Project", (table) => {
    table.string("id").primary();
    table.string("key").notNullable().unique();
    table.string("name").notNullable();
    table.specificType("status", '"ProjectLifecycleStatus"').notNullable().defaultTo("active");
    table.timestamp("createdAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("PlatformAdminUser", (table) => {
    table.string("id").primary();
    table.string("username").notNullable().unique();
    table.string("passwordHash").notNullable();
    table.timestamp("createdAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("PlatformSession", (table) => {
    table.string("id").primary();
    table.string("platformAdminId").notNullable();
    table.string("refreshHash").notNullable();
    table.timestamp("expiresAt", { useTz: true }).notNullable();
    table.timestamp("revokedAt", { useTz: true }).nullable();
    table.timestamp("createdAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table
      .foreign("platformAdminId")
      .references("id")
      .inTable("PlatformAdminUser")
      .onDelete("CASCADE");
    table.index(["platformAdminId"]);
  });

  await knex.schema.createTable("TenantUser", (table) => {
    table.string("id").primary();
    table.string("projectId").notNullable();
    table.string("username").notNullable();
    table.string("displayName").notNullable();
    table.string("passwordHash").notNullable();
    table.specificType("role", '"TenantRole"').notNullable();
    table.specificType("status", '"UserStatus"').notNullable().defaultTo("active");
    table.timestamp("createdAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("deletedAt", { useTz: true }).nullable();
    table.foreign("projectId").references("id").inTable("Project").onDelete("CASCADE");
    table.unique(["projectId", "username"]);
    table.index(["projectId"]);
  });

  await knex.schema.createTable("TenantSession", (table) => {
    table.string("id").primary();
    table.string("projectId").notNullable();
    table.string("userId").notNullable();
    table.string("refreshHash").notNullable();
    table.string("offlineTicketHash").nullable();
    table.timestamp("offlineTicketExpiresAt", { useTz: true }).nullable();
    table.timestamp("expiresAt", { useTz: true }).notNullable();
    table.timestamp("revokedAt", { useTz: true }).nullable();
    table.timestamp("createdAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign("userId").references("id").inTable("TenantUser").onDelete("CASCADE");
    table.index(["projectId"]);
    table.index(["userId"]);
  });

  await knex.schema.createTable("SyncBatch", (table) => {
    table.string("id").primary();
    table.string("projectId").notNullable();
    table.string("deviceId").notNullable();
    table.string("batchId").notNullable();
    table.timestamp("createdAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign("projectId").references("id").inTable("Project").onDelete("CASCADE");
    table.unique(["projectId", "deviceId", "batchId"]);
  });

  await knex.schema.createTable("SyncEvent", (table) => {
    table.string("id").primary();
    table.string("projectId").notNullable();
    table.string("eventId").notNullable();
    table.timestamp("createdAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign("projectId").references("id").inTable("Project").onDelete("CASCADE");
    table.unique(["projectId", "eventId"]);
  });

  await knex.schema.createTable("SyncRecord", (table) => {
    table.string("id").primary();
    table.string("projectId").notNullable();
    table.string("entityType").notNullable();
    table.string("entityId").notNullable();
    table.jsonb("value").notNullable();
    table.timestamp("updatedAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("deletedAt", { useTz: true }).nullable();
    table.foreign("projectId").references("id").inTable("Project").onDelete("CASCADE");
    table.unique(["projectId", "entityType", "entityId"]);
    table.index(["projectId", "entityType"]);
  });

  await knex.schema.createTable("ChangeLog", (table) => {
    table.string("id").primary();
    table.string("projectId").notNullable();
    table.integer("seq").notNullable();
    table.string("entityType").notNullable();
    table.string("entityId").notNullable();
    table.string("op").notNullable();
    table.jsonb("data").nullable();
    table.timestamp("occurredAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign("projectId").references("id").inTable("Project").onDelete("CASCADE");
    table.unique(["projectId", "seq"]);
    table.index(["projectId", "occurredAt"]);
  });

  await knex.schema.createTable("DeviceCheckpoint", (table) => {
    table.string("id").primary();
    table.string("projectId").notNullable();
    table.string("userId").notNullable();
    table.string("deviceId").notNullable();
    table.string("scope").notNullable();
    table.integer("cursor").notNullable();
    table.timestamp("updatedAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign("projectId").references("id").inTable("Project").onDelete("CASCADE");
    table.unique(["projectId", "userId", "deviceId", "scope"]);
  });

  await knex.schema.createTable("BlobManifest", (table) => {
    table.string("id").primary();
    table.string("projectId").notNullable();
    table.string("cid").notNullable();
    table.string("mime").notNullable();
    table.integer("size").notNullable();
    table.binary("bytes").nullable();
    table.timestamp("createdAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign("projectId").references("id").inTable("Project").onDelete("CASCADE");
    table.unique(["projectId", "cid"]);
  });

  await knex.schema.createTable("PlatformJob", (table) => {
    table.string("id").primary();
    table.string("projectId").notNullable();
    table.string("kind").notNullable();
    table.specificType("status", '"PlatformJobStatus"').notNullable().defaultTo("queued");
    table.jsonb("payload").nullable();
    table.jsonb("result").nullable();
    table.timestamp("createdAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign("projectId").references("id").inTable("Project").onDelete("CASCADE");
    table.index(["projectId"]);
  });

  await knex.schema.createTable("PlatformAuditLog", (table) => {
    table.string("id").primary();
    table.string("actorAdminId").notNullable();
    table.string("projectId").nullable();
    table.string("action").notNullable();
    table.string("reasonCode").nullable();
    table.string("ticketRef").nullable();
    table.string("traceId").notNullable();
    table.jsonb("beforeState").nullable();
    table.jsonb("afterState").nullable();
    table.timestamp("createdAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table
      .foreign("actorAdminId")
      .references("id")
      .inTable("PlatformAdminUser")
      .onDelete("CASCADE");
    table.foreign("projectId").references("id").inTable("Project");
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("PlatformAuditLog");
  await knex.schema.dropTableIfExists("PlatformJob");
  await knex.schema.dropTableIfExists("BlobManifest");
  await knex.schema.dropTableIfExists("DeviceCheckpoint");
  await knex.schema.dropTableIfExists("ChangeLog");
  await knex.schema.dropTableIfExists("SyncRecord");
  await knex.schema.dropTableIfExists("SyncEvent");
  await knex.schema.dropTableIfExists("SyncBatch");
  await knex.schema.dropTableIfExists("TenantSession");
  await knex.schema.dropTableIfExists("TenantUser");
  await knex.schema.dropTableIfExists("PlatformSession");
  await knex.schema.dropTableIfExists("PlatformAdminUser");
  await knex.schema.dropTableIfExists("Project");

  await knex.raw('DROP TYPE IF EXISTS "PlatformJobStatus";');
  await knex.raw('DROP TYPE IF EXISTS "TenantRole";');
  await knex.raw('DROP TYPE IF EXISTS "UserStatus";');
  await knex.raw('DROP TYPE IF EXISTS "ProjectLifecycleStatus";');
}

