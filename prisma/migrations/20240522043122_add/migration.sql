-- CreateTable
CREATE TABLE "link_sources" (
    "link_source_id" SERIAL NOT NULL,
    "link_source_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "link_sources_pkey" PRIMARY KEY ("link_source_id")
);

-- CreateTable
CREATE TABLE "link_types" (
    "link_type_id" SERIAL NOT NULL,
    "link_type_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "link_types_pkey" PRIMARY KEY ("link_type_id")
);

-- CreateTable
CREATE TABLE "links" (
    "link_id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "recorded_by_id" INTEGER NOT NULL,
    "link_source_id" INTEGER NOT NULL,
    "link_type_id" INTEGER NOT NULL,

    CONSTRAINT "links_pkey" PRIMARY KEY ("link_id")
);

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_link_source_id_fkey" FOREIGN KEY ("link_source_id") REFERENCES "link_sources"("link_source_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_link_type_id_fkey" FOREIGN KEY ("link_type_id") REFERENCES "link_types"("link_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;
