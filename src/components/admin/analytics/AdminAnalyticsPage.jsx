import { QueueInsightsSection } from "../../layout/QueueInsightsSection";

export function AdminAnalyticsPage({
  waitingNow,
  servingNow,
  servedToday,
  absentNow,
  submissions,
  liveQueuePoints,
  now,
  theme,
}) {
  return (
    <QueueInsightsSection
      waitingNow={waitingNow}
      servingNow={servingNow}
      servedToday={servedToday}
      absentNow={absentNow}
      submissions={submissions}
      liveQueuePoints={liveQueuePoints}
      now={now}
      theme={theme}
    />
  );
}
