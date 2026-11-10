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
import { safeFetch } from '@/server/lib/safe-fetch';
import { buildPluginContext } from '@/server/plugins/context';
import { applyFilters, runActionNow } from '@/server/plugins/hooks';
import { pluginsService } from '@/server/plugins/plugins.service';
import { sendMail } from '@/server/services/mail';

export type FormActionType =
  | 'email'
  | 'redirect'
  | 'webhook'
  | 'mailchimp'
  | (string & {});

export type FormActionsConfig = {
  actions?: FormActionType[];
  emailTo?: string;
  emailSubject?: string;
  emailReplyToField?: string;
  redirectUrl?: string;
  webhookUrl?: string;
  /** Optional per-form secret; when set, deliveries carry an HMAC-SHA256 signature. */
  webhookSecret?: string;
  mailchimpListId?: string;
  mailchimpEmailField?: string;
  mailchimpFirstNameField?: string;
  mailchimpLastNameField?: string;
  mailchimpTags?: string;
  mailchimpDoubleOptIn?: boolean;
  [key: string]: unknown;
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

          // The visitor typed this, so only a plain address is used as Reply-To.
          const replyToRaw = config.emailReplyToField
            ? payload[config.emailReplyToField]?.trim()
            : undefined;
          const replyTo =
            replyToRaw &&
            /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(replyToRaw)
              ? replyToRaw
              : undefined;

          const result = await sendMail({
            to: toRecipients,
            subject: config.emailSubject?.trim() || 'New form submission',
            text: lines.join('\n') || 'A form was submitted with no fields.',
            replyTo: replyTo || undefined,
          });

          // sendMail reports instead of throwing when mail isn't set up.
          actionLog.push(
            result.sent
              ? {
                  action: 'email',
                  status: 'success',
                  message: `Notification sent to ${toRecipients}.`,
                  at,
                }
              : {
                  action: 'email',
                  status: 'skipped',
                  message: result.reason || 'Email was not sent.',
                  at,
                }
          );
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
          // Signed only with this form's own secret: a shared fallback would let
          // anyone forge signatures, and the app's secret must never be handed out.
          const secret = config.webhookSecret?.trim();
          const signature = secret
            ? createHmac('sha256', secret).update(body).digest('hex')
            : null;

          const response = await safeFetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(signature && { 'X-Webhook-Signature': `sha256=${signature}` }),
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

    // 3. Plugin-contributed form actions (`form.actions` filter)
    const pluginActions = await applyFilters('form.actions', [], { siteId });
    const pluginActionsById = new Map(pluginActions.map(a => [a.id, a]));
    const builtinSet = new Set(['email', 'redirect', 'webhook']);

    for (const actionId of actions) {
      if (builtinSet.has(actionId)) continue;
      const pluginAction = pluginActionsById.get(actionId);
      if (!pluginAction) continue;

      const at = new Date().toISOString();
      try {
        const pluginId = pluginAction.pluginId ?? actionId;
        const settings = await pluginsService.getServerSettings(
          siteId,
          pluginId
        );
        const ctx = await buildPluginContext({
          pluginId,
          siteId,
          settings,
        });
        const res = await pluginAction.run(
          {
            submissionId,
            siteId,
            payload,
            files: files.map(f => ({
              field: f.field,
              name: f.name,
              size: f.size,
              mime: f.mime,
            })),
            config: config as Record<string, unknown>,
          },
          ctx
        );
        if (res) {
          actionLog.push({
            action: actionId,
            status: res.status,
            ...(res.message ? { message: res.message } : {}),
            ...(res.error ? { error: res.error } : {}),
            at,
          });
        } else {
          actionLog.push({
            action: actionId,
            status: 'success',
            at,
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        actionLog.push({
          action: actionId,
          status: 'error',
          error: message,
          at,
        });
        if (pluginAction.pluginId) {
          await pluginsService.recordPluginError(
            siteId,
            pluginAction.pluginId,
            `Form action "${actionId}": ${message}`
          );
        }
      }
    }

    // Fire `form.submitted` hook (built-in webhook subscriber + enabled plugins)
    await runActionNow('form.submitted', {
      submissionId,
      siteId,
      payload,
      files: files.map(f => ({
        field: f.field,
        name: f.name,
        size: f.size,
        mime: f.mime,
      })),
    });

    // Update submission record with actionLog
    await db
      .update(formSubmissions)
      .set({ actionLog, updatedAt: new Date() })
      .where(eq(formSubmissions.id, submissionId));

    return actionLog;
  },
};
