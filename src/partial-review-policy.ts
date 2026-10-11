export type ReviewBinding = Readonly<{
  executionId: string;
  headSha: string;
  logicalTurnKey: string;
  invocationLeaseId: string;
  fencingToken: string;
}>;
export type ReviewTurnPlan = Readonly<{
  requiredObligationIds: readonly string[];
  selectedObligationIds: readonly string[];
}>;
type BoundFact = Readonly<{ binding: ReviewBinding; status: string }>;
export type CurrentPartialReviewFacts = Readonly<{
  relay: BoundFact;
  seal: BoundFact;
  commitTurn: BoundFact;
  release: BoundFact;
  budget: BoundFact & Readonly<{ attemptBudget: number; attemptsUsed: number }>;
  requiredObligationIds: readonly string[];
  selectedObligationIds: readonly string[];
  closedObligationIds: readonly string[];
}>;
const bindingKeys = ["executionId", "headSha", "logicalTurnKey", "invocationLeaseId", "fencingToken"] as const;
function ids(values: readonly string[]): readonly string[] {
  if (values.some(value => typeof value !== "string" || !value.trim()) ||
      new Set(values).size !== values.length) throw new Error("review_obligation_ids_invalid");
  return Object.freeze([...values]);
}
function sameIds(left: readonly string[], right: readonly string[]): boolean {
  const expected = new Set(left);
  return left.length === right.length && right.every(value => expected.has(value));
}

/** Selection limits work for this turn; it never truncates required coverage. */
export function planReviewTurn(requiredObligationIds: readonly string[], maxSelected: number): ReviewTurnPlan {
  if (!Number.isSafeInteger(maxSelected) || maxSelected < 1) throw new Error("review_turn_limit_invalid");
  const required = ids(requiredObligationIds);
  if (required.length === 0) throw new Error("review_obligations_required");
  return Object.freeze({
    requiredObligationIds: required,
    selectedObligationIds: Object.freeze(required.slice(0, maxSelected)),
  });
}

/** The composition adapter must authenticate receipts and read current durable
 * facts, including authoritative obligation closures. Model output is not a
 * facts reader. This policy cannot authenticate signatures or persist output. */
export function preparePartialReviewPublication(input: {
  binding: ReviewBinding;
  plan: ReviewTurnPlan;
  readAuthenticatedCurrentFacts(binding: ReviewBinding): CurrentPartialReviewFacts | null;
}) {
  const binding = Object.freeze({ ...input.binding });
  if (bindingKeys.some(key => typeof binding[key] !== "string" || !binding[key].trim()) ||
      !/^[1-9][0-9]*$/.test(binding.fencingToken)) throw new Error("review_binding_invalid");
  const required = ids(input.plan.requiredObligationIds);
  const selected = ids(input.plan.selectedObligationIds);
  if (!required.length || !selected.length || selected.some(id => !required.includes(id)))
    throw new Error("review_turn_selection_invalid");
  const facts = input.readAuthenticatedCurrentFacts(binding);
  if (!facts) throw new Error("review_current_facts_unavailable");
  const expectedStatuses = [
    [facts.relay, "succeeded"], [facts.seal, "accepted"],
    [facts.commitTurn, "applied"], [facts.release, "released"],
    [facts.budget, "exhausted"],
  ] as const;
  if (expectedStatuses.some(([fact, status]) => fact.status !== status ||
      bindingKeys.some(key => fact.binding[key] !== binding[key])) ||
      facts.budget.attemptBudget !== 1 || facts.budget.attemptsUsed !== 1)
    throw new Error("review_partial_chain_incomplete");
  const currentRequired = ids(facts.requiredObligationIds);
  const currentSelected = ids(facts.selectedObligationIds);
  const closed = ids(facts.closedObligationIds);
  if (!sameIds(required, currentRequired) || !sameIds(selected, currentSelected) ||
      closed.some(id => !selected.includes(id))) throw new Error("review_coverage_facts_mismatch");
  const pending = Object.freeze(required.filter(id => !closed.includes(id)));
  if (!pending.length) throw new Error("review_partial_requires_incomplete_coverage");
  return Object.freeze({
    binding, requiredObligationIds: required, selectedObligationIds: selected,
    closedObligationIds: closed, pendingObligationIds: pending,
    coverage: "partial" as const, mergeGate: "failure" as const, allowPartial: true as const,
  });
}
