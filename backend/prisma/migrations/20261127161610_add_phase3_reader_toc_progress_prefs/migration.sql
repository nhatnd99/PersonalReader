-- AlterTable
ALTER TABLE "books" ADD COLUMN     "content_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "toc_version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "book_table_of_contents" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "parent_id" UUID,
    "title" TEXT NOT NULL,
    "anchor_id" TEXT NOT NULL,
    "content_block_id" TEXT,
    "content_sequence" INTEGER NOT NULL DEFAULT 1,
    "level" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "source_type" TEXT NOT NULL DEFAULT 'AUTO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_table_of_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "current_toc_entry_id" UUID,
    "current_block_id" TEXT,
    "current_sequence" INTEGER NOT NULL DEFAULT 1,
    "scroll_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reading_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_device_id" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "font_size" INTEGER NOT NULL DEFAULT 18,
    "font_family" TEXT NOT NULL DEFAULT 'serif',
    "line_height" DOUBLE PRECISION NOT NULL DEFAULT 1.75,
    "content_width" INTEGER NOT NULL DEFAULT 720,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "book_table_of_contents_book_id_position_idx" ON "book_table_of_contents"("book_id", "position");

-- CreateIndex
CREATE INDEX "book_table_of_contents_book_id_parent_id_idx" ON "book_table_of_contents"("book_id", "parent_id");

-- CreateIndex
CREATE INDEX "reading_progress_user_id_idx" ON "reading_progress"("user_id");

-- CreateIndex
CREATE INDEX "reading_progress_book_id_idx" ON "reading_progress"("book_id");

-- CreateIndex
CREATE UNIQUE INDEX "reading_progress_user_id_book_id_key" ON "reading_progress"("user_id", "book_id");

-- CreateIndex
CREATE UNIQUE INDEX "reading_preferences_user_id_key" ON "reading_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "book_table_of_contents" ADD CONSTRAINT "book_table_of_contents_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_table_of_contents" ADD CONSTRAINT "book_table_of_contents_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "book_table_of_contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_current_toc_entry_id_fkey" FOREIGN KEY ("current_toc_entry_id") REFERENCES "book_table_of_contents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_preferences" ADD CONSTRAINT "reading_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
