-- CreateTable
CREATE TABLE "books" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "description" TEXT,
    "original_file_name" TEXT NOT NULL,
    "cover_image_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "page_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_files" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "storage_provider" TEXT NOT NULL DEFAULT 'r2',
    "bucket" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL DEFAULT 'application/pdf',
    "file_size" INTEGER NOT NULL,
    "checksum" TEXT,
    "upload_status" TEXT NOT NULL DEFAULT 'completed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID,
    "object_key" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL DEFAULT 'application/pdf',
    "expected_file_size" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "books_user_id_idx" ON "books"("user_id");

-- CreateIndex
CREATE INDEX "books_status_idx" ON "books"("status");

-- CreateIndex
CREATE INDEX "books_user_id_status_created_at_idx" ON "books"("user_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "book_files_object_key_key" ON "book_files"("object_key");

-- CreateIndex
CREATE INDEX "book_files_book_id_idx" ON "book_files"("book_id");

-- CreateIndex
CREATE INDEX "book_files_object_key_idx" ON "book_files"("object_key");

-- CreateIndex
CREATE UNIQUE INDEX "upload_sessions_object_key_key" ON "upload_sessions"("object_key");

-- CreateIndex
CREATE INDEX "upload_sessions_user_id_idx" ON "upload_sessions"("user_id");

-- CreateIndex
CREATE INDEX "upload_sessions_object_key_idx" ON "upload_sessions"("object_key");

-- CreateIndex
CREATE INDEX "upload_sessions_status_idx" ON "upload_sessions"("status");

-- CreateIndex
CREATE INDEX "upload_sessions_expires_at_idx" ON "upload_sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_files" ADD CONSTRAINT "book_files_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;
