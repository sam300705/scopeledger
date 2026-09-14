ALTER TABLE `projects` ADD `archived_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE `project_amendments` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `project_id` text NOT NULL,
  `version` integer NOT NULL,
  `scope` text NOT NULL,
  `budget` integer NOT NULL,
  `rate` integer NOT NULL,
  `due_date` text NOT NULL,
  `reason` text NOT NULL,
  `created_by` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_project_amendments_project_version` ON `project_amendments` (`project_id`,`version`);
--> statement-breakpoint
CREATE INDEX `idx_project_amendments_workspace` ON `project_amendments` (`workspace_id`);
--> statement-breakpoint
ALTER TABLE `changes` ADD `pricing_mode` text DEFAULT 'hourly' NOT NULL;
--> statement-breakpoint
ALTER TABLE `changes` ADD `line_items` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `changes` ADD `exclusions` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `changes` ADD `proposal_version` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `changes` ADD `approved_proposal_version` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `changes` ADD `decision_source` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `changes` ADD `decided_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `changes` ADD `approved_amount` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `changes` ADD `delivered_amount` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `changes` ADD `invoiced_amount` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `changes` ADD `paid_amount` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `proposals` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `change_id` text NOT NULL,
  `version` integer NOT NULL,
  `title` text NOT NULL,
  `description` text NOT NULL,
  `pricing_mode` text NOT NULL,
  `line_items` text NOT NULL,
  `exclusions` text NOT NULL,
  `minutes` integer NOT NULL,
  `rate` integer NOT NULL,
  `amount` integer NOT NULL,
  `delay_days` integer NOT NULL,
  `due_date` text NOT NULL,
  `created_by` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`change_id`) REFERENCES `changes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_proposals_change_version` ON `proposals` (`change_id`,`version`);
--> statement-breakpoint
CREATE INDEX `idx_proposals_workspace` ON `proposals` (`workspace_id`);
--> statement-breakpoint
CREATE TABLE `client_access_links` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `change_id` text NOT NULL,
  `proposal_version` integer NOT NULL,
  `token_hash` text NOT NULL,
  `client_email` text NOT NULL,
  `expires_at` text NOT NULL,
  `revoked_at` text DEFAULT '' NOT NULL,
  `used_at` text DEFAULT '' NOT NULL,
  `created_by` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`change_id`) REFERENCES `changes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_client_access_token_hash` ON `client_access_links` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `idx_client_access_change` ON `client_access_links` (`change_id`);
--> statement-breakpoint
CREATE TABLE `invitations` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `email` text NOT NULL,
  `role` text NOT NULL,
  `token_hash` text NOT NULL,
  `expires_at` text NOT NULL,
  `revoked_at` text DEFAULT '' NOT NULL,
  `accepted_at` text DEFAULT '' NOT NULL,
  `created_by` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_invitations_token_hash` ON `invitations` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `idx_invitations_workspace_email` ON `invitations` (`workspace_id`,`email`);