CREATE TABLE `idempotency_keys` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `actor_id` text NOT NULL,
  `operation` text NOT NULL,
  `request_key` text NOT NULL,
  `response_json` text NOT NULL,
  `status_code` integer NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_idempotency_scope` ON `idempotency_keys` (`workspace_id`,`actor_id`,`operation`,`request_key`);
--> statement-breakpoint
CREATE INDEX `idx_idempotency_created` ON `idempotency_keys` (`created_at`);
