-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password_changed_at" DROP NOT NULL,
ALTER COLUMN "password_changed_at" DROP DEFAULT;
