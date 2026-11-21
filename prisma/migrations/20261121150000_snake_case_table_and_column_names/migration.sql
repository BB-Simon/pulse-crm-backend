-- Rename tables, columns, primary keys, indexes and foreign keys to snake_case.
-- Pure renames: no data is dropped or rewritten.

-- User -> users
ALTER TABLE "User" RENAME TO "users";
ALTER TABLE "users" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "users" RENAME COLUMN "passwordHash" TO "password_hash";
ALTER TABLE "users" RENAME COLUMN "firstName" TO "first_name";
ALTER TABLE "users" RENAME COLUMN "lastName" TO "last_name";
ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "users" RENAME CONSTRAINT "User_pkey" TO "users_pkey";
ALTER INDEX "User_email_key" RENAME TO "users_email_key";
ALTER INDEX "User_organizationId_role_idx" RENAME TO "users_organization_id_role_idx";
ALTER TABLE "users" RENAME CONSTRAINT "User_organizationId_fkey" TO "users_organization_id_fkey";

-- Company -> companies
ALTER TABLE "Company" RENAME TO "companies";
ALTER TABLE "companies" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "companies" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "companies" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "companies" RENAME CONSTRAINT "Company_pkey" TO "companies_pkey";
ALTER INDEX "Company_organizationId_name_idx" RENAME TO "companies_organization_id_name_idx";
ALTER TABLE "companies" RENAME CONSTRAINT "Company_organizationId_fkey" TO "companies_organization_id_fkey";

-- Contact -> contacts
ALTER TABLE "Contact" RENAME TO "contacts";
ALTER TABLE "contacts" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "contacts" RENAME COLUMN "ownerId" TO "owner_id";
ALTER TABLE "contacts" RENAME COLUMN "companyId" TO "company_id";
ALTER TABLE "contacts" RENAME COLUMN "firstName" TO "first_name";
ALTER TABLE "contacts" RENAME COLUMN "lastName" TO "last_name";
ALTER TABLE "contacts" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "contacts" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "contacts" RENAME COLUMN "leadScore" TO "lead_score";
ALTER TABLE "contacts" RENAME COLUMN "leadScoreRationale" TO "lead_score_rationale";
ALTER TABLE "contacts" RENAME COLUMN "leadScoredAt" TO "lead_scored_at";
ALTER TABLE "contacts" RENAME CONSTRAINT "Contact_pkey" TO "contacts_pkey";
ALTER INDEX "Contact_organizationId_ownerId_idx" RENAME TO "contacts_organization_id_owner_id_idx";
ALTER INDEX "Contact_organizationId_companyId_idx" RENAME TO "contacts_organization_id_company_id_idx";
ALTER INDEX "Contact_organizationId_email_idx" RENAME TO "contacts_organization_id_email_idx";
ALTER INDEX "Contact_organizationId_createdAt_idx" RENAME TO "contacts_organization_id_created_at_idx";
ALTER INDEX "Contact_tags_idx" RENAME TO "contacts_tags_idx";
ALTER TABLE "contacts" RENAME CONSTRAINT "Contact_organizationId_fkey" TO "contacts_organization_id_fkey";
ALTER TABLE "contacts" RENAME CONSTRAINT "Contact_ownerId_fkey" TO "contacts_owner_id_fkey";
ALTER TABLE "contacts" RENAME CONSTRAINT "Contact_companyId_fkey" TO "contacts_company_id_fkey";

-- PipelineStage -> pipeline_stages
ALTER TABLE "PipelineStage" RENAME TO "pipeline_stages";
ALTER TABLE "pipeline_stages" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "pipeline_stages" RENAME COLUMN "isWon" TO "is_won";
ALTER TABLE "pipeline_stages" RENAME COLUMN "isLost" TO "is_lost";
ALTER TABLE "pipeline_stages" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "pipeline_stages" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "pipeline_stages" RENAME CONSTRAINT "PipelineStage_pkey" TO "pipeline_stages_pkey";
ALTER INDEX "PipelineStage_organizationId_idx" RENAME TO "pipeline_stages_organization_id_idx";
ALTER INDEX "PipelineStage_organizationId_order_key" RENAME TO "pipeline_stages_organization_id_order_key";
ALTER TABLE "pipeline_stages" RENAME CONSTRAINT "PipelineStage_organizationId_fkey" TO "pipeline_stages_organization_id_fkey";

-- Deal -> deals
ALTER TABLE "Deal" RENAME TO "deals";
ALTER TABLE "deals" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "deals" RENAME COLUMN "ownerId" TO "owner_id";
ALTER TABLE "deals" RENAME COLUMN "contactId" TO "contact_id";
ALTER TABLE "deals" RENAME COLUMN "companyId" TO "company_id";
ALTER TABLE "deals" RENAME COLUMN "pipelineStageId" TO "pipeline_stage_id";
ALTER TABLE "deals" RENAME COLUMN "expectedCloseDate" TO "expected_close_date";
ALTER TABLE "deals" RENAME COLUMN "closedAt" TO "closed_at";
ALTER TABLE "deals" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "deals" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "deals" RENAME CONSTRAINT "Deal_pkey" TO "deals_pkey";
ALTER INDEX "Deal_organizationId_ownerId_idx" RENAME TO "deals_organization_id_owner_id_idx";
ALTER INDEX "Deal_organizationId_pipelineStageId_idx" RENAME TO "deals_organization_id_pipeline_stage_id_idx";
ALTER INDEX "Deal_organizationId_status_idx" RENAME TO "deals_organization_id_status_idx";
ALTER INDEX "Deal_organizationId_expectedCloseDate_idx" RENAME TO "deals_organization_id_expected_close_date_idx";
ALTER INDEX "Deal_organizationId_contactId_idx" RENAME TO "deals_organization_id_contact_id_idx";
ALTER TABLE "deals" RENAME CONSTRAINT "Deal_organizationId_fkey" TO "deals_organization_id_fkey";
ALTER TABLE "deals" RENAME CONSTRAINT "Deal_ownerId_fkey" TO "deals_owner_id_fkey";
ALTER TABLE "deals" RENAME CONSTRAINT "Deal_contactId_fkey" TO "deals_contact_id_fkey";
ALTER TABLE "deals" RENAME CONSTRAINT "Deal_companyId_fkey" TO "deals_company_id_fkey";
ALTER TABLE "deals" RENAME CONSTRAINT "Deal_pipelineStageId_fkey" TO "deals_pipeline_stage_id_fkey";

-- Activity -> activities
ALTER TABLE "Activity" RENAME TO "activities";
ALTER TABLE "activities" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "activities" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "activities" RENAME COLUMN "contactId" TO "contact_id";
ALTER TABLE "activities" RENAME COLUMN "dealId" TO "deal_id";
ALTER TABLE "activities" RENAME COLUMN "occurredAt" TO "occurred_at";
ALTER TABLE "activities" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "activities" RENAME CONSTRAINT "Activity_pkey" TO "activities_pkey";
ALTER INDEX "Activity_organizationId_contactId_idx" RENAME TO "activities_organization_id_contact_id_idx";
ALTER INDEX "Activity_organizationId_dealId_idx" RENAME TO "activities_organization_id_deal_id_idx";
ALTER INDEX "Activity_organizationId_occurredAt_idx" RENAME TO "activities_organization_id_occurred_at_idx";
ALTER INDEX "Activity_organizationId_userId_idx" RENAME TO "activities_organization_id_user_id_idx";
ALTER TABLE "activities" RENAME CONSTRAINT "Activity_organizationId_fkey" TO "activities_organization_id_fkey";
ALTER TABLE "activities" RENAME CONSTRAINT "Activity_userId_fkey" TO "activities_user_id_fkey";
ALTER TABLE "activities" RENAME CONSTRAINT "Activity_contactId_fkey" TO "activities_contact_id_fkey";
ALTER TABLE "activities" RENAME CONSTRAINT "Activity_dealId_fkey" TO "activities_deal_id_fkey";

-- Task -> tasks
ALTER TABLE "Task" RENAME TO "tasks";
ALTER TABLE "tasks" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "tasks" RENAME COLUMN "assigneeId" TO "assignee_id";
ALTER TABLE "tasks" RENAME COLUMN "contactId" TO "contact_id";
ALTER TABLE "tasks" RENAME COLUMN "dealId" TO "deal_id";
ALTER TABLE "tasks" RENAME COLUMN "dueDate" TO "due_date";
ALTER TABLE "tasks" RENAME COLUMN "completedAt" TO "completed_at";
ALTER TABLE "tasks" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "tasks" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "tasks" RENAME COLUMN "overdueNotifiedAt" TO "overdue_notified_at";
ALTER TABLE "tasks" RENAME CONSTRAINT "Task_pkey" TO "tasks_pkey";
ALTER INDEX "Task_organizationId_assigneeId_idx" RENAME TO "tasks_organization_id_assignee_id_idx";
ALTER INDEX "Task_organizationId_dueDate_idx" RENAME TO "tasks_organization_id_due_date_idx";
ALTER INDEX "Task_organizationId_completed_idx" RENAME TO "tasks_organization_id_completed_idx";
ALTER INDEX "Task_organizationId_contactId_idx" RENAME TO "tasks_organization_id_contact_id_idx";
ALTER INDEX "Task_organizationId_dealId_idx" RENAME TO "tasks_organization_id_deal_id_idx";
ALTER TABLE "tasks" RENAME CONSTRAINT "Task_organizationId_fkey" TO "tasks_organization_id_fkey";
ALTER TABLE "tasks" RENAME CONSTRAINT "Task_assigneeId_fkey" TO "tasks_assignee_id_fkey";
ALTER TABLE "tasks" RENAME CONSTRAINT "Task_contactId_fkey" TO "tasks_contact_id_fkey";
ALTER TABLE "tasks" RENAME CONSTRAINT "Task_dealId_fkey" TO "tasks_deal_id_fkey";

-- Invite -> invites
ALTER TABLE "Invite" RENAME TO "invites";
ALTER TABLE "invites" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "invites" RENAME COLUMN "invitedById" TO "invited_by_id";
ALTER TABLE "invites" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "invites" RENAME COLUMN "acceptedAt" TO "accepted_at";
ALTER TABLE "invites" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "invites" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "invites" RENAME CONSTRAINT "Invite_pkey" TO "invites_pkey";
ALTER INDEX "Invite_token_key" RENAME TO "invites_token_key";
ALTER INDEX "Invite_organizationId_email_idx" RENAME TO "invites_organization_id_email_idx";
ALTER INDEX "Invite_organizationId_status_idx" RENAME TO "invites_organization_id_status_idx";
ALTER TABLE "invites" RENAME CONSTRAINT "Invite_organizationId_fkey" TO "invites_organization_id_fkey";
ALTER TABLE "invites" RENAME CONSTRAINT "Invite_invitedById_fkey" TO "invites_invited_by_id_fkey";

-- Subscription -> subscriptions
ALTER TABLE "Subscription" RENAME TO "subscriptions";
ALTER TABLE "subscriptions" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "subscriptions" RENAME COLUMN "stripeCustomerId" TO "stripe_customer_id";
ALTER TABLE "subscriptions" RENAME COLUMN "stripeSubscriptionId" TO "stripe_subscription_id";
ALTER TABLE "subscriptions" RENAME COLUMN "seatLimit" TO "seat_limit";
ALTER TABLE "subscriptions" RENAME COLUMN "contactLimit" TO "contact_limit";
ALTER TABLE "subscriptions" RENAME COLUMN "currentPeriodEnd" TO "current_period_end";
ALTER TABLE "subscriptions" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "subscriptions" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "subscriptions" RENAME CONSTRAINT "Subscription_pkey" TO "subscriptions_pkey";
ALTER INDEX "Subscription_organizationId_key" RENAME TO "subscriptions_organization_id_key";
ALTER INDEX "Subscription_stripeCustomerId_key" RENAME TO "subscriptions_stripe_customer_id_key";
ALTER INDEX "Subscription_stripeSubscriptionId_key" RENAME TO "subscriptions_stripe_subscription_id_key";
ALTER INDEX "Subscription_status_idx" RENAME TO "subscriptions_status_idx";
ALTER TABLE "subscriptions" RENAME CONSTRAINT "Subscription_organizationId_fkey" TO "subscriptions_organization_id_fkey";

-- Notification -> notifications
ALTER TABLE "Notification" RENAME TO "notifications";
ALTER TABLE "notifications" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "notifications" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "notifications" RENAME COLUMN "readAt" TO "read_at";
ALTER TABLE "notifications" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "notifications" RENAME CONSTRAINT "Notification_pkey" TO "notifications_pkey";
ALTER INDEX "Notification_organizationId_userId_readAt_idx" RENAME TO "notifications_organization_id_user_id_read_at_idx";
ALTER INDEX "Notification_userId_createdAt_idx" RENAME TO "notifications_user_id_created_at_idx";
ALTER TABLE "notifications" RENAME CONSTRAINT "Notification_organizationId_fkey" TO "notifications_organization_id_fkey";
ALTER TABLE "notifications" RENAME CONSTRAINT "Notification_userId_fkey" TO "notifications_user_id_fkey";

-- Webhook -> webhooks
ALTER TABLE "Webhook" RENAME TO "webhooks";
ALTER TABLE "webhooks" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "webhooks" RENAME COLUMN "targetUrl" TO "target_url";
ALTER TABLE "webhooks" RENAME COLUMN "subscribedEvents" TO "subscribed_events";
ALTER TABLE "webhooks" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "webhooks" RENAME COLUMN "createdById" TO "created_by_id";
ALTER TABLE "webhooks" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "webhooks" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "webhooks" RENAME CONSTRAINT "Webhook_pkey" TO "webhooks_pkey";
ALTER INDEX "Webhook_organizationId_idx" RENAME TO "webhooks_organization_id_idx";
ALTER INDEX "Webhook_subscribedEvents_idx" RENAME TO "webhooks_subscribed_events_idx";
ALTER TABLE "webhooks" RENAME CONSTRAINT "Webhook_organizationId_fkey" TO "webhooks_organization_id_fkey";
ALTER TABLE "webhooks" RENAME CONSTRAINT "Webhook_createdById_fkey" TO "webhooks_created_by_id_fkey";

-- WebhookDelivery -> webhook_deliveries
ALTER TABLE "WebhookDelivery" RENAME TO "webhook_deliveries";
ALTER TABLE "webhook_deliveries" RENAME COLUMN "webhookId" TO "webhook_id";
ALTER TABLE "webhook_deliveries" RENAME COLUMN "eventType" TO "event_type";
ALTER TABLE "webhook_deliveries" RENAME COLUMN "responseCode" TO "response_code";
ALTER TABLE "webhook_deliveries" RENAME COLUMN "deliveredAt" TO "delivered_at";
ALTER TABLE "webhook_deliveries" RENAME CONSTRAINT "WebhookDelivery_pkey" TO "webhook_deliveries_pkey";
ALTER INDEX "WebhookDelivery_webhookId_deliveredAt_idx" RENAME TO "webhook_deliveries_webhook_id_delivered_at_idx";
ALTER TABLE "webhook_deliveries" RENAME CONSTRAINT "WebhookDelivery_webhookId_fkey" TO "webhook_deliveries_webhook_id_fkey";

-- ApiKey -> api_keys
ALTER TABLE "ApiKey" RENAME TO "api_keys";
ALTER TABLE "api_keys" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "api_keys" RENAME COLUMN "keyPreview" TO "key_preview";
ALTER TABLE "api_keys" RENAME COLUMN "hashedKey" TO "hashed_key";
ALTER TABLE "api_keys" RENAME COLUMN "createdById" TO "created_by_id";
ALTER TABLE "api_keys" RENAME COLUMN "lastUsedAt" TO "last_used_at";
ALTER TABLE "api_keys" RENAME COLUMN "revokedAt" TO "revoked_at";
ALTER TABLE "api_keys" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "api_keys" RENAME CONSTRAINT "ApiKey_pkey" TO "api_keys_pkey";
ALTER INDEX "ApiKey_hashedKey_key" RENAME TO "api_keys_hashed_key_key";
ALTER INDEX "ApiKey_organizationId_idx" RENAME TO "api_keys_organization_id_idx";
ALTER TABLE "api_keys" RENAME CONSTRAINT "ApiKey_organizationId_fkey" TO "api_keys_organization_id_fkey";
ALTER TABLE "api_keys" RENAME CONSTRAINT "ApiKey_createdById_fkey" TO "api_keys_created_by_id_fkey";
