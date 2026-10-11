export type V4FailureStage =
  | "begin-dispatch" | "fetch" | "status" | "response-record"
  | "body-read" | "response-verify" | "response-complete";
export type V4MediaTypeCategory = "sse" | "json" | "html" | "other" | "missing";
export type V4StatusDiagnostic = Readonly<{
  bodyPresent?: boolean;
  composedSignalAborted?: boolean;
  mediaTypeCategory?: V4MediaTypeCategory;
}>;
const mediaTypes = new Set(["sse", "json", "html", "other", "missing"]);
/** Return a category only; no raw header value leaves this function. */
export function v4MediaTypeCategory(value: unknown): V4MediaTypeCategory {
  if (typeof value !== "string" || value.trim() === "") return "missing";
  const type = value.split(";", 1)[0]!.trim().toLowerCase();
  return type === "text/event-stream" ? "sse"
    : type === "application/json" ? "json" : type === "text/html" ? "html" : "other";
}
const names = new Set(["Error", "TypeError", "AbortError", "TimeoutError"]);
const codes = new Set([
  "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_SOCKET",
  "CERT_HAS_EXPIRED", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "DEPTH_ZERO_SELF_SIGNED_CERT",
]);
function member(value: unknown, key: string): unknown {
  try {
    return value !== null && typeof value === "object"
      ? (value as Record<string, unknown>)[key] : undefined;
  } catch { return undefined; }
}
function allowed(value: unknown, values: ReadonlySet<string>): string | null {
  return typeof value === "string" && values.has(value) ? value : null;
}
/** Closed vocabulary only. Never inspect messages, body bytes, raw headers, URLs or custody. */
export function v4FailureDiagnostic(stage: V4FailureStage, error: unknown,
  callerAborted: boolean, heartbeatAborted: boolean, upstreamStatus?: number,
  status?: V4StatusDiagnostic) {
  const bodyPresent = member(status, "bodyPresent");
  return {
    kind: "hosted_v4_one_shot_unknown",
    stage,
    errorName: allowed(member(error, "name"), names),
    errorCode: allowed(member(error, "code"), codes),
    causeCode: allowed(member(member(error, "cause"), "code"), codes),
    callerAborted: callerAborted === true,
    heartbeatAborted: heartbeatAborted === true,
    upstreamStatus: Number.isInteger(upstreamStatus) && upstreamStatus! >= 100 && upstreamStatus! <= 599
      ? upstreamStatus! : null,
    bodyPresent: typeof bodyPresent === "boolean" ? bodyPresent : null,
    composedSignalAborted: member(status, "composedSignalAborted") === true,
    mediaTypeCategory: allowed(member(status, "mediaTypeCategory"), mediaTypes),
  };
}
/** Reporting cannot change the original UNKNOWN finalization or authorize retry. */
export function reportV4FailureDiagnostic(stage: V4FailureStage, error: unknown,
  callerAborted: boolean, heartbeatAborted: boolean, upstreamStatus?: number,
  sink = (line: string) => console.error(line), status?: V4StatusDiagnostic): void {
  try { sink(JSON.stringify(v4FailureDiagnostic(stage, error, callerAborted, heartbeatAborted, upstreamStatus, status))); }
  catch { /* Preserve the original catch path even when reporting fails. */ }
}
