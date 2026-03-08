ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "company_name" varchar(200);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "company_website" varchar(500);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "company_size" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_type" varchar(20) DEFAULT 'personal' NOT NULL;