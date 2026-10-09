CREATE TYPE "public"."check_type" AS ENUM('category', 'level', 'role', 'activity_name', 'name_match', 'deadline', 'completeness', 'credit');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('certificate', 'supporting');--> statement-breakpoint
CREATE TYPE "public"."final_form_status" AS ENUM('none', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."finding_result" AS ENUM('pass', 'warn', 'fail');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'telegram');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."reader_strategy" AS ENUM('text', 'vision', 'ocr', 'cache');--> statement-breakpoint
CREATE TYPE "public"."review_decision" AS ENUM('approve', 'reject', 'adjust_credit');--> statement-breakpoint
CREATE TYPE "public"."review_stage" AS ENUM('verifier', 'validator');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('queued', 'analyzing', 'ready', 'needs_fix', 'problem', 'error', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('running', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('draft', 'waiting_verifier', 'waiting_validator', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'verifier', 'validator', 'unit');--> statement-breakpoint
CREATE TABLE "agent_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"run_id" integer NOT NULL,
	"seq" integer NOT NULL,
	"field" text NOT NULL,
	"question" text NOT NULL,
	"options" jsonb,
	"answer" text,
	"answered_at" timestamp with time zone,
	CONSTRAINT "agent_questions_submission_seq_unique" UNIQUE("submission_id","seq"),
	CONSTRAINT "agent_questions_seq_check" CHECK ("agent_questions"."seq" BETWEEN 1 AND 3)
);
--> statement-breakpoint
CREATE TABLE "batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"student_id" integer NOT NULL,
	"file_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "batches_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "batches_file_count_check" CHECK ("batches"."file_count" BETWEEN 1 AND 10)
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"advisor_id" integer,
	CONSTRAINT "classes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"type" "document_type" NOT NULL,
	"file_path" text NOT NULL,
	"file_name" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"page_count" integer
);
--> statement-breakpoint
CREATE TABLE "extraction_cache" (
	"sha256" text NOT NULL,
	"reader_version" text NOT NULL,
	"model" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "extraction_cache_sha256_reader_version_pk" PRIMARY KEY("sha256","reader_version")
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"check_type" "check_type" NOT NULL,
	"result" "finding_result" NOT NULL,
	"confidence" real,
	"guideline_ref" text,
	"message" text NOT NULL,
	"data" jsonb
);
--> statement-breakpoint
CREATE TABLE "llm_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer,
	"submission_id" integer,
	"purpose" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer,
	"cache_hit" boolean DEFAULT false NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"submission_id" integer,
	"channel" "notification_channel" NOT NULL,
	"trigger_review_id" integer,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "precheck_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"attempt" integer NOT NULL,
	"model" text NOT NULL,
	"reader_strategy" "reader_strategy",
	"status" "run_status" NOT NULL,
	"extracted" jsonb,
	"classification" jsonb,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"reviewer_id" integer NOT NULL,
	"stage" "review_stage" NOT NULL,
	"decision" "review_decision" NOT NULL,
	"note" text,
	"previous_credit" numeric(4, 2),
	"adjusted_credit" numeric(4, 2),
	"adjust_reason" text,
	"signature_applied" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_reject_note_check" CHECK (("reviews"."decision" <> 'reject') OR (length(trim("reviews"."note")) > 0)),
	CONSTRAINT "reviews_adjust_reason_check" CHECK (("reviews"."adjusted_credit" IS NULL) OR (length(trim("reviews"."adjust_reason")) > 0))
);
--> statement-breakpoint
CREATE TABLE "status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"field" text NOT NULL,
	"from_value" text,
	"to_value" text NOT NULL,
	"changed_by" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"batch_id" integer,
	"student_id" integer NOT NULL,
	"class_id" integer NOT NULL,
	"status" "submission_status" DEFAULT 'draft' NOT NULL,
	"review_status" "review_status" DEFAULT 'queued' NOT NULL,
	"activity_name" text,
	"activity_date" date,
	"location_platform" text,
	"organizer" text,
	"attachment_type" text,
	"komponen" integer,
	"category_code" text,
	"level" text,
	"role_in_activity" text,
	"achievement" text,
	"credit_entry_id" text,
	"estimated_credit" numeric(4, 2),
	"final_credit" numeric(4, 2),
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"final_form_path" text,
	"final_form_status" "final_form_status" DEFAULT 'none' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone,
	"last_error" text,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submissions_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nrp" text,
	"role" "user_role" NOT NULL,
	"angkatan" integer,
	"program_studi" text,
	"departemen" text,
	"jabatan" text,
	"class_id" integer,
	"signature_path" text,
	"telegram_chat_id" text,
	"telegram_link_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_nrp_unique" UNIQUE("nrp")
);
--> statement-breakpoint
ALTER TABLE "agent_questions" ADD CONSTRAINT "agent_questions_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_questions" ADD CONSTRAINT "agent_questions_run_id_precheck_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."precheck_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_advisor_id_users_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_run_id_precheck_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."precheck_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_calls" ADD CONSTRAINT "llm_calls_run_id_precheck_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."precheck_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_calls" ADD CONSTRAINT "llm_calls_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_trigger_review_id_reviews_id_fk" FOREIGN KEY ("trigger_review_id") REFERENCES "public"."reviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precheck_runs" ADD CONSTRAINT "precheck_runs_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documents_submission_idx" ON "documents" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "documents_sha256_idx" ON "documents" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX "findings_run_idx" ON "findings" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "llm_calls_submission_idx" ON "llm_calls" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "llm_calls_created_at_idx" ON "llm_calls" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "precheck_runs_submission_idx" ON "precheck_runs" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "reviews_submission_idx" ON "reviews" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "reviews_reviewer_stage_idx" ON "reviews" USING btree ("reviewer_id","stage");--> statement-breakpoint
CREATE INDEX "status_history_submission_created_idx" ON "status_history" USING btree ("submission_id","created_at");--> statement-breakpoint
CREATE INDEX "submissions_queued_idx" ON "submissions" USING btree ("created_at") WHERE review_status = 'queued';--> statement-breakpoint
CREATE INDEX "submissions_class_status_idx" ON "submissions" USING btree ("class_id","status");--> statement-breakpoint
CREATE INDEX "submissions_student_status_idx" ON "submissions" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "submissions_batch_idx" ON "submissions" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "users_class_id_idx" ON "users" USING btree ("class_id");