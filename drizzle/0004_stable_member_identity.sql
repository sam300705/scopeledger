ALTER TABLE `members` ADD `user_id` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_members_workspace_user` ON `members` (`workspace_id`,`user_id`);
