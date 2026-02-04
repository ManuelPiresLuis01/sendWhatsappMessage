import cron from "node-cron";

export class CronScheduler {
  schedule(expression, task, timezone) {
    return cron.schedule(expression, task, { timezone });
  }
}
