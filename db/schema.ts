import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
export const workspaces = sqliteTable("workspaces", {
 id:text("id").primaryKey(), owner_id:text("owner_id").notNull(), name:text("name").notNull(), currency:text("currency").notNull(), created_at:text("created_at").notNull(), demo:integer("demo").notNull().default(0)
},t=>[index("idx_workspaces_owner").on(t.owner_id)]);
export const members = sqliteTable("members", {
 id:text("id").primaryKey(), workspace_id:text("workspace_id").notNull().references(()=>workspaces.id), email:text("email").notNull(), role:text("role").notNull(), created_at:text("created_at").notNull()
},t=>[uniqueIndex("idx_members_workspace_email").on(t.workspace_id,t.email),index("idx_members_email").on(t.email)]);
export const projects = sqliteTable("projects", {
 id:text("id").primaryKey(), workspace_id:text("workspace_id").notNull().references(()=>workspaces.id), name:text("name").notNull(), client:text("client").notNull(), client_email:text("client_email").notNull(), scope:text("scope").notNull(), budget:integer("budget").notNull(), rate:integer("rate").notNull(), due_date:text("due_date").notNull(), created_at:text("created_at").notNull()
},t=>[index("idx_projects_workspace").on(t.workspace_id)]);
export const changes = sqliteTable("changes", {
 id:text("id").primaryKey(), workspace_id:text("workspace_id").notNull().references(()=>workspaces.id), project_id:text("project_id").notNull().references(()=>projects.id), title:text("title").notNull(), description:text("description").notNull(), source:text("source").notNull(), minutes:integer("minutes").notNull(), rate:integer("rate").notNull(), amount:integer("amount").notNull(), delay_days:integer("delay_days").notNull(), due_date:text("due_date").notNull(), status:text("status").notNull().default("pending"), approver:text("approver").notNull().default(""), evidence:text("evidence").notNull().default(""), created_by:text("created_by").notNull(), created_at:text("created_at").notNull(), updated_at:text("updated_at").notNull(), version:integer("version").notNull().default(1)
},t=>[index("idx_changes_workspace").on(t.workspace_id),index("idx_changes_project").on(t.project_id)]);
export const events = sqliteTable("events", {
 id:text("id").primaryKey(), workspace_id:text("workspace_id").notNull().references(()=>workspaces.id), entity_id:text("entity_id").notNull(), action:text("action").notNull(), actor:text("actor").notNull(), detail:text("detail").notNull(), created_at:text("created_at").notNull()
},t=>[index("idx_events_workspace_created").on(t.workspace_id,t.created_at)]);
