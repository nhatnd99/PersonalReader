-- AlterTable
ALTER TABLE "books" ADD COLUMN     "annotations_version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "highlights" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "toc_entry_id" UUID,
    "selected_text" TEXT NOT NULL,
    "anchor_data" JSONB NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'yellow',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "highlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "toc_entry_id" UUID,
    "chapter_title" TEXT,
    "anchor_data" JSONB NOT NULL,
    "selected_text" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_notes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "toc_entry_id" UUID,
    "chapter_title" TEXT,
    "anchor_data" JSONB,
    "selected_text" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID,
    "toc_entry_id" UUID,
    "chapter_title" TEXT,
    "word" TEXT NOT NULL,
    "normalized_word" TEXT NOT NULL,
    "part_of_speech" TEXT,
    "meaning" TEXT NOT NULL,
    "contextual_meaning" TEXT,
    "example_sentence" TEXT,
    "anchor_data" JSONB,
    "pronunciation" TEXT,
    "personal_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocabulary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "highlights_user_id_book_id_idx" ON "highlights"("user_id", "book_id");

-- CreateIndex
CREATE INDEX "highlights_book_id_idx" ON "highlights"("book_id");

-- CreateIndex
CREATE INDEX "bookmarks_user_id_book_id_idx" ON "bookmarks"("user_id", "book_id");

-- CreateIndex
CREATE INDEX "bookmarks_book_id_idx" ON "bookmarks"("book_id");

-- CreateIndex
CREATE INDEX "reading_notes_user_id_book_id_idx" ON "reading_notes"("user_id", "book_id");

-- CreateIndex
CREATE INDEX "reading_notes_book_id_idx" ON "reading_notes"("book_id");

-- CreateIndex
CREATE INDEX "vocabulary_entries_user_id_idx" ON "vocabulary_entries"("user_id");

-- CreateIndex
CREATE INDEX "vocabulary_entries_user_id_book_id_idx" ON "vocabulary_entries"("user_id", "book_id");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_entries_user_id_book_id_normalized_word_key" ON "vocabulary_entries"("user_id", "book_id", "normalized_word");

-- AddForeignKey
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_notes" ADD CONSTRAINT "reading_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_notes" ADD CONSTRAINT "reading_notes_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_entries" ADD CONSTRAINT "vocabulary_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_entries" ADD CONSTRAINT "vocabulary_entries_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;
