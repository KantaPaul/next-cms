import 'server-only';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { postsService } from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.service';

const INTERVAL_MS = 60_000;
let lastRun = 0;
let running = false;

/**
 * Best-effort scheduled publishing for self-hosted installs without a cron job:
 * runs at most once a minute per server process, triggered by site traffic.
 * `/api/cron/publish` remains the reliable path.
 */
export function maybePublishScheduled() {
  const now = Date.now();
  if (running || now - lastRun < INTERVAL_MS) return;
  lastRun = now;
  running = true;
  Promise.all([
    pagesServices.publishDueScheduled(),
    postsService.publishDueScheduled(),
  ])
    .catch(error => console.error('Scheduled publish failed', error))
    .finally(() => {
      running = false;
    });
}
