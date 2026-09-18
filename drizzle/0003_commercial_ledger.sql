CREATE TABLE `invoices` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `change_id` text NOT NULL,
  `reference` text DEFAULT '' NOT NULL,
  `amount` integer NOT NULL CHECK (`amount` > 0),
  `status` text DEFAULT 'issued' NOT NULL CHECK (`status` IN ('issued','void')),
  `due_date` text DEFAULT '' NOT NULL,
  `issued_at` text NOT NULL,
  `created_by` text NOT NULL,
  `created_at` text NOT NULL,
  `voided_at` text DEFAULT '' NOT NULL,
  `void_reason` text DEFAULT '' NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`change_id`) REFERENCES `changes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_invoices_workspace_created` ON `invoices` (`workspace_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_invoices_change_status` ON `invoices` (`change_id`,`status`);
--> statement-breakpoint
CREATE TABLE `payments` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `change_id` text NOT NULL,
  `invoice_id` text NOT NULL,
  `reference` text DEFAULT '' NOT NULL,
  `amount` integer NOT NULL CHECK (`amount` > 0),
  `status` text DEFAULT 'received' NOT NULL CHECK (`status` IN ('received','reversed')),
  `received_at` text NOT NULL,
  `created_by` text NOT NULL,
  `created_at` text NOT NULL,
  `reversed_at` text DEFAULT '' NOT NULL,
  `reversal_reason` text DEFAULT '' NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`change_id`) REFERENCES `changes`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_payments_workspace_created` ON `payments` (`workspace_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_payments_invoice_status` ON `payments` (`invoice_id`,`status`);
--> statement-breakpoint
CREATE INDEX `idx_payments_change` ON `payments` (`change_id`);
