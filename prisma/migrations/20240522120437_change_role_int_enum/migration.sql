/*
  Warnings:

  - You are about to drop the column `user_role` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "user_role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';
