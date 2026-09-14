CREATE TABLE `workspace_deletion_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `requested_by` text NOT NULL,
  `requested_at` text NOT NULL,
  `eligible_after` text NOT NULL,
  `cancelled_at` text DEFAULT '' NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_workspace_deletion_requests_workspace` ON `workspace_deletion_requests` (`workspace_id`,`requested_at`);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
  `bucket_key` text PRIMARY KEY NOT NULL,
  `window_start` integer NOT NULL,
  `count` integer NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rate_limits_updated` ON `rate_limits` (`updated_at`);