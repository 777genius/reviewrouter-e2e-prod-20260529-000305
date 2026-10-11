# Standalone partial-review policy review

This new subject adds an actual standalone policy feature in
`src/partial-review-policy.ts`: retain the complete required obligation inventory,
select a bounded subset for one turn, and prepare an honest partial publication
only after authenticated current facts show the exact bound relay succeeded,
context seal accepted, turn commit applied, lease released and one attempt budget
exhausted. Pending obligations stay visible; coverage is partial and the merge
gate remains failure, including when there are no findings.

The facts-reader adapter owns receipt authentication and fresh durable reads.
The policy checks identity across every phase and rejects mismatched inventory,
unselected closures, UNKNOWN or incomplete chains, and complete coverage presented
as partial. It does not execute a provider call, authenticate raw signatures,
persist an artifact or replace production finalization.

Review the new module and its documented trust boundary. This is a meaningful
functional review fixture, not a nonce, planted defect, diagnostic replay or proof
that production uses this implementation. A clean review is a legitimate result.
The pre-existing diagnostic sources, baseline and workflow are unchanged. The
consumed PR12 diagnostic subject and all historical UNKNOWN outcomes stay frozen.

The fixture reuses the existing disposable repository
777genius/reviewrouter-e2e-prod-20260529-000305. Source preparation performs no Git
commit, push, PR, admission, provider call, build or runtime execution. The root
executor owns any separately authorized E2E effects and validation.
