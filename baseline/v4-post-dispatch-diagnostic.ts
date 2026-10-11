export type V4FailureStage =
  | "begin-dispatch" | "fetch" | "status" | "response-record"
  | "body-read" | "response-verify" | "response-complete";
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
/** Closed vocabulary only. Never inspect messages, bodies, headers, URLs or custody. */
export function v4FailureDiagnostic(stage: V4FailureStage, error: unknown,
  callerAborted: boolean, heartbeatAborted: boolean, upstreamStatus?: number) {
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
  };
}
/** Reporting cannot change the original UNKNOWN finalization or authorize retry. */
export function reportV4FailureDiagnostic(stage: V4FailureStage, error: unknown,
  callerAborted: boolean, heartbeatAborted: boolean, upstreamStatus?: number,
  sink = (line: string) => console.error(line)): void {
  try { sink(JSON.stringify(v4FailureDiagnostic(stage, error, callerAborted, heartbeatAborted, upstreamStatus))); }
  catch { /* Preserve the original catch path even when reporting fails. */ }
}
