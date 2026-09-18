CREATE INDEX `idx_projects_workspace_created_id` ON `projects` (`workspace_id`,`created_at`,`id`);
--> statement-breakpoint
CREATE INDEX `idx_projects_workspace_archived_created` ON `projects` (`workspace_id`,`archived_at`,`created_at`,`id`);
--> statement-breakpoint
CREATE INDEX `idx_changes_workspace_created_id` ON `changes` (`workspace_id`,`created_at`,`id`);
--> statement-breakpoint
CREATE INDEX `idx_changes_workspace_status_created` ON `changes` (`workspace_id`,`status`,`created_at`,`id`);
--> statement-breakpoint
CREATE INDEX `idx_changes_workspace_project_created` ON `changes` (`workspace_id`,`project_id`,`created_at`,`id`);
--> statement-breakpoint
CREATE INDEX `idx_proposals_workspace_created_id` ON `proposals` (`workspace_id`,`created_at`,`id`);
--> statement-breakpoint
CREATE INDEX `idx_invitations_workspace_created_id` ON `invitations` (`workspace_id`,`created_at`,`id`);
--> statement-breakpoint
CREATE INDEX `idx_client_links_workspace_created_id` ON `client_access_links` (`workspace_id`,`created_at`,`id`);
--> statement-breakpoint
CREATE INDEX `idx_invoices_workspace_created_id` ON `invoices` (`workspace_id`,`created_at`,`id`);
--> statement-breakpoint
CREATE INDEX `idx_payments_workspace_created_id` ON `payments` (`workspace_id`,`created_at`,`id`);
--> statement-breakpoint
CREATE INDEX `idx_events_workspace_created_id` ON `events` (`workspace_id`,`created_at`,`id`);
