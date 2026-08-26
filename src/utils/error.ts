/**
 * Maps raw backend errors to friendly user-facing messages.
 */
export function formatErrorMessage(err: unknown): string {
  if (typeof err === "string") {
    return err;
  }
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "未知错误，请检查网络或配置";
}
