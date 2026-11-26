-- AlterTable
ALTER TABLE "books" ADD COLUMN     "processing_status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "total_pages" INTEGER,
ADD COLUMN     "total_words" INTEGER;

-- CreateTable
CREATE TABLE "book_contents" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "content_html" TEXT NOT NULL,
    "plain_text" TEXT NOT NULL,
    "source_page_start" INTEGER NOT NULL,
    "source_page_end" INTEGER NOT NULL,
    "word_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_chapters" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "start_content_sequence" INTEGER NOT NULL,
    "end_content_sequence" INTEGER NOT NULL,

    CONSTRAINT "book_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_import_jobs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "current_step" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "book_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "book_contents_book_id_sequence_idx" ON "book_contents"("book_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "book_contents_book_id_sequence_key" ON "book_contents"("book_id", "sequence");

-- CreateIndex
CREATE INDEX "book_chapters_book_id_sequence_idx" ON "book_chapters"("book_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "book_chapters_book_id_sequence_key" ON "book_chapters"("book_id", "sequence");

-- CreateIndex
CREATE INDEX "book_import_jobs_user_id_idx" ON "book_import_jobs"("user_id");

-- CreateIndex
CREATE INDEX "book_import_jobs_book_id_idx" ON "book_import_jobs"("book_id");

-- CreateIndex
CREATE INDEX "book_import_jobs_status_idx" ON "book_import_jobs"("status");

-- CreateIndex
CREATE INDEX "books_processing_status_idx" ON "books"("processing_status");

-- AddForeignKey
ALTER TABLE "book_contents" ADD CONSTRAINT "book_contents_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_chapters" ADD CONSTRAINT "book_chapters_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_import_jobs" ADD CONSTRAINT "book_import_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_import_jobs" ADD CONSTRAINT "book_import_jobs_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
