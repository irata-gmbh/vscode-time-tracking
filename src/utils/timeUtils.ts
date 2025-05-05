/**
 * Formats a duration in milliseconds to a human-readable string (HH:MM:SS)
 * @param milliseconds Duration in milliseconds
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    remainingSeconds.toString().padStart(2, "0"),
  ].join(":");
}

/**
 * Formats a duration in milliseconds to a short format (Xh Ym)
 * @param milliseconds Duration in milliseconds
 */
export function formatDurationShort(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Gets a date formatted as YYYY-MM-DD
 * @param date Date to format
 */
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Gets the current week number in the year
 */
export function getCurrentWeekNumber(): number {
  const now = new Date();
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const dayNumber = Math.floor(
    (now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000),
  );
  return Math.ceil((dayNumber + oneJan.getDay()) / 7);
}

/**
 * Groups time sessions by day
 */
export function groupSessionsByDay(sessions: any[]): Record<string, any[]> {
  const groupedSessions: Record<string, any[]> = {};

  sessions.forEach((session) => {
    const dateKey = formatDate(new Date(session.startTime));
    if (!groupedSessions[dateKey]) {
      groupedSessions[dateKey] = [];
    }
    groupedSessions[dateKey].push(session);
  });

  return groupedSessions;
}

/**
 * Groups time sessions by project
 */
export function groupSessionsByProject(sessions: any[]): Record<string, any[]> {
  const groupedSessions: Record<string, any[]> = {};

  sessions.forEach((session) => {
    const projectKey = session.project || "No Project";
    if (!groupedSessions[projectKey]) {
      groupedSessions[projectKey] = [];
    }
    groupedSessions[projectKey].push(session);
  });

  return groupedSessions;
}
