-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "full_name" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "must_change_pwd" BOOLEAN NOT NULL DEFAULT false,
    "failed_logins" INTEGER NOT NULL DEFAULT 0,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafe_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" TEXT,

    CONSTRAINT "cafe_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'standard',
    "enabledFeatures" JSONB NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "signature" TEXT NOT NULL,
    "last_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "actor_id" TEXT,
    "actor_email" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remote_addr" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_members" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "services" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "token" TEXT NOT NULL,
    "password_hash" TEXT,
    "telegram_enabled" BOOLEAN NOT NULL DEFAULT false,
    "telegram_bot_token" TEXT,
    "telegram_chat_id" TEXT,
    "insightmap_tenant_id" TEXT,
    "insightmap_central_sub" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_branches" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geofence_meters" INTEGER NOT NULL DEFAULT 500,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_staff" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafe_menu_items" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "branch_slug" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'coffee',
    "price_cents" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cafe_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafe_tables" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "branch_slug" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cafe_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafe_inventory" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "branch_slug" TEXT,
    "menu_item_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "threshold" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cafe_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "day_shifts" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "branch_slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_by" TEXT,
    "closed_at" TIMESTAMP(3),
    "closed_by" TEXT,
    "opening_float_cents" INTEGER NOT NULL DEFAULT 0,
    "expected_cents" INTEGER,
    "counted_cents" INTEGER,
    "summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "day_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_accounts" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "branch_slug" TEXT NOT NULL,
    "day_shift_id" TEXT NOT NULL,
    "table_code" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requested_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "payment_method" TEXT,
    "total_cents" INTEGER NOT NULL DEFAULT 0,
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "table_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "branch_slug" TEXT NOT NULL,
    "day_shift_id" TEXT NOT NULL,
    "account_id" TEXT,
    "table_code" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "total_cents" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "menu_item_id" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price_cents" INTEGER NOT NULL,
    "line_total_cents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ordered',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "site" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_code_key" ON "tenants"("code");

-- CreateIndex
CREATE INDEX "tenants_deleted_at_idx" ON "tenants"("deleted_at");

-- CreateIndex
CREATE INDEX "branches_tenant_id_deleted_at_idx" ON "branches"("tenant_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "branches_tenant_id_code_key" ON "branches"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "users_tenant_id_branch_id_deleted_at_idx" ON "users"("tenant_id", "branch_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_username_key" ON "users"("tenant_id", "username");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refresh_token_key" ON "auth_sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_revoked_at_idx" ON "auth_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "cafe_settings_tenant_id_branch_id_key_key" ON "cafe_settings"("tenant_id", "branch_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_tenant_id_branch_id_device_id_key" ON "licenses"("tenant_id", "branch_id", "device_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_branch_id_occurred_at_idx" ON "audit_logs"("tenant_id", "branch_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_entity_type_entity_id_idx" ON "audit_logs"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "access_members_email_key" ON "access_members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "access_members_slug_key" ON "access_members"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "access_members_domain_key" ON "access_members"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "access_members_token_key" ON "access_members"("token");

-- CreateIndex
CREATE INDEX "access_members_insightmap_tenant_id_idx" ON "access_members"("insightmap_tenant_id");

-- CreateIndex
CREATE INDEX "access_branches_member_id_active_idx" ON "access_branches"("member_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "access_branches_member_id_slug_key" ON "access_branches"("member_id", "slug");

-- CreateIndex
CREATE INDEX "access_staff_member_id_idx" ON "access_staff"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "access_staff_member_id_email_key" ON "access_staff"("member_id", "email");

-- CreateIndex
CREATE INDEX "cafe_menu_items_member_id_branch_slug_idx" ON "cafe_menu_items"("member_id", "branch_slug");

-- CreateIndex
CREATE UNIQUE INDEX "cafe_menu_items_member_id_branch_slug_id_key" ON "cafe_menu_items"("member_id", "branch_slug", "id");

-- CreateIndex
CREATE INDEX "cafe_tables_member_id_branch_slug_idx" ON "cafe_tables"("member_id", "branch_slug");

-- CreateIndex
CREATE UNIQUE INDEX "cafe_tables_member_id_branch_slug_code_key" ON "cafe_tables"("member_id", "branch_slug", "code");

-- CreateIndex
CREATE INDEX "cafe_inventory_member_id_branch_slug_idx" ON "cafe_inventory"("member_id", "branch_slug");

-- CreateIndex
CREATE UNIQUE INDEX "cafe_inventory_member_id_branch_slug_menu_item_id_key" ON "cafe_inventory"("member_id", "branch_slug", "menu_item_id");

-- CreateIndex
CREATE INDEX "day_shifts_member_id_branch_slug_status_idx" ON "day_shifts"("member_id", "branch_slug", "status");

-- CreateIndex
CREATE UNIQUE INDEX "day_shifts_member_id_branch_slug_opened_at_key" ON "day_shifts"("member_id", "branch_slug", "opened_at");

-- CreateIndex
CREATE INDEX "table_accounts_member_id_branch_slug_status_idx" ON "table_accounts"("member_id", "branch_slug", "status");

-- CreateIndex
CREATE INDEX "table_accounts_day_shift_id_status_idx" ON "table_accounts"("day_shift_id", "status");

-- CreateIndex
CREATE INDEX "table_accounts_table_code_status_idx" ON "table_accounts"("table_code", "status");

-- CreateIndex
CREATE INDEX "orders_member_id_branch_slug_status_idx" ON "orders"("member_id", "branch_slug", "status");

-- CreateIndex
CREATE INDEX "orders_account_id_idx" ON "orders"("account_id");

-- CreateIndex
CREATE INDEX "orders_day_shift_id_status_idx" ON "orders"("day_shift_id", "status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_status_idx" ON "order_items"("status");

-- CreateIndex
CREATE INDEX "leads_email_idx" ON "leads"("email");

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafe_settings" ADD CONSTRAINT "cafe_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafe_settings" ADD CONSTRAINT "cafe_settings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_branches" ADD CONSTRAINT "access_branches_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "access_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_staff" ADD CONSTRAINT "access_staff_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "access_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_accounts" ADD CONSTRAINT "table_accounts_day_shift_id_fkey" FOREIGN KEY ("day_shift_id") REFERENCES "day_shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_day_shift_id_fkey" FOREIGN KEY ("day_shift_id") REFERENCES "day_shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "table_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

