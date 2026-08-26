/**
 * Date and time helper functions.
 */

/**
 * Returns ISO strings for start and end of standard time presets.
 */
export function getTimeRangeBounds(preset: "today" | "24h" | "7d" | "30d"): {
  startIso: string;
  endIso: string;
} {
  const now = new Date();
  const endIso = now.toISOString();

  let start: Date;
  switch (preset) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "24h":
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  return { startIso: start.toISOString(), endIso };
}
