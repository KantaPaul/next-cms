import 'server-only';
import { createHmac } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  type FormActionLogEntry,
  type FormSubmissionFile,
  formSubmissions,
} from '@/db/schema';
import { env } from '@/env.mjs';
import { sendMail } from '@/server/services/mail';
import { webhookService } from '@/server/services/webhook.service';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { safeFetch } from '@/server/lib/safe-fetch';
import { upsertMailchimpMember } from '@/server/integrations/mailchimp';

export type FormActionType = 'email' | 'redirect' | 'webhook' | 'mailchimp';

export type FormActionsConfig = {
  actions?: FormActionType[];
  emailTo?: string;
  emailSubject?: string;
  emailReplyToField?: string;
  redirectUrl?: string;
  webhookUrl?: string;
  mailchimpListId?: string;
  mailchimpEmailField?: string;
  mailchimpFirstNameField?: string;
  mailchimpLastNameField?: string;
  mailchimpTags?: string;
  mailchimpDoubleOptIn?: boolean;
};

export type ExecuteActionsParams = {
  submissionId: string;
  siteId: string;
  payload: Record<string, string>;
  files: FormSubmissionFile[];
  config: FormActionsConfig;
};

export const formActionsService = {
  executeActions: async ({
    submissionId,
    siteId,
    payload,
    files,
    config,
  }: ExecuteActionsParams): Promise<FormActionLogEntry[]> => {
    const actionLog: FormActionLogEntry[] = [];
    const actions = config.actions ?? [];

    // 1. Email notification action
    if (actions.includes('email')) {
      const at = new Date().toISOString();
      try {
        const toRecipients = config.emailTo?.trim() || env.FORM_NOTIFY_TO;
        if (!toRecipients) {
          actionLog.push({
            action: 'email',
            status: 'skipped',
            message: 'No recipient email configured.',
            at,
          });
        } else {
          const lines = Object.entries(payload).map(
            ([key, val]) => `${key}: ${val}`
          );
          if (files.length > 0) {
            lines.push('\nUploaded files:');
            for (const f of files) {
              lines.push(` - ${f.name} (${Math.round(f.size / 1024)} KB)`);
            }
          }

          const replyTo = config.emailReplyToField
            ? payload[config.emailReplyToField]?.trim()
            : undefined;

          await sendMail({
            to: toRecipients,
            subject: config.emailSubject?.trim() || 'New form submission',
            text: lines.join('\n') || 'A form was submitted with no fields.',
            replyTo: replyTo || undefined,
          });

          actionLog.push({
            action: 'email',
            status: 'success',
            message: `Notification sent to ${toRecipients}.`,
            at,
          });
        }
      } catch (err: unknown) {
        actionLog.push({
          action: 'email',
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
          at,
        });
      }
    }

    // 2. Webhook action
    if (actions.includes('webhook')) {
      const at = new Date().toISOString();
      const webhookUrl = config.webhookUrl?.trim();
      if (!webhookUrl) {
        actionLog.push({
          action: 'webhook',
          status: 'skipped',
          message: 'No webhook URL configured.',
          at,
        });
      } else {
        try {
          const webhookPayload = {
            id: submissionId,
            siteId,
            payload,
            files: files.map(f => ({
              field: f.field,
              name: f.name,
              size: f.size,
              mime: f.mime,
            })),
            submittedAt: at,
          };
          const body = JSON.stringify(webhookPayload);
          const signature = createHmac(
            'sha256',
            process.env.APP_SECRET || 'form-webhook'
          )
            .update(body)
            .digest('hex');

          const response = await safeFetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signature,
            },
            body,
          });

          if (!response.ok) {
            const errText = await response.text().catch(() => '');
            actionLog.push({
              action: 'webhook',
              status: 'error',
              error: `Webhook returned status ${response.status}: ${errText.slice(0, 300)}`,
              at,
            });
          } else {
            actionLog.push({
              action: 'webhook',
              status: 'success',
              message: `Webhook delivered successfully (${response.status}).`,
              at,
            });
          }
        } catch (err: unknown) {
          actionLog.push({
            action: 'webhook',
            status: 'error',
            error: err instanceof Error ? err.message : String(err),
            at,
          });
        }
      }
    }

    // 3. Mailchimp action
    if (actions.includes('mailchimp')) {
      const at = new Date().toISOString();
      try {
        const settings = await siteSettingsService.get();
        const apiKey = settings.integrations?.mailchimp?.apiKey?.trim();
        const listId = config.mailchimpListId?.trim();

        if (!apiKey) {
          actionLog.push({
            action: 'mailchimp',
            status: 'skipped',
            message:
              'No Mailchimp API key configured in Settings > Integrations.',
            at,
          });
        } else if (!listId) {
          actionLog.push({
            action: 'mailchimp',
            status: 'error',
            error: 'No Mailchimp audience (list) selected.',
            at,
          });
        } else {
          const emailFieldName = config.mailchimpEmailField?.trim() || 'email';
          const email = payload[emailFieldName]?.trim();

          if (!email) {
            actionLog.push({
              action: 'mailchimp',
              status: 'error',
              error: `Field "${emailFieldName}" was empty or not submitted.`,
              at,
            });
          } else {
            const firstName = config.mailchimpFirstNameField
              ? payload[config.mailchimpFirstNameField]?.trim()
              : payload.firstName?.trim() || payload.name?.trim();
            const lastName = config.mailchimpLastNameField
              ? payload[config.mailchimpLastNameField]?.trim()
              : payload.lastName?.trim();
            const tags = config.mailchimpTags
              ? config.mailchimpTags
                  .split(',')
                  .map(t => t.trim())
                  .filter(Boolean)
              : undefined;

            await upsertMailchimpMember(apiKey, listId, {
              email,
              firstName,
              lastName,
              tags,
              doubleOptIn: config.mailchimpDoubleOptIn ?? false,
            });

            actionLog.push({
              action: 'mailchimp',
              status: 'success',
              message: `Member ${email} upserted to audience ${listId}.`,
              at,
            });
          }
        }
      } catch (err: unknown) {
        actionLog.push({
          action: 'mailchimp',
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
          at,
        });
      }
    }

    // Always fire the global form.submitted webhook event
    try {
      await webhookService.deliver(
        submissionId,
        'form.submitted',
        { id: submissionId, type: 'form' },
        siteId
      );
    } catch {
      // webhookService.deliver catches internally, but guard just in case
    }

    // Update submission record with actionLog
    await db
      .update(formSubmissions)
      .set({ actionLog, updatedAt: new Date() })
      .where(eq(formSubmissions.id, submissionId));

    return actionLog;
  },
};
