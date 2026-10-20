# Host session contract for HU-VEN-12

This task authorizes an additive implementation in Front, not ratification of
pending architecture decisions in synkro-docs. Sales retains its intent journal;
Front never reads or deletes it. Auth HTTP contracts, renewal margin, rotation,
revocation and protected 401/403 policy remain unchanged.

`shell/session` retains `user(): {sub, role} | null` and adds
`sessionId(): string | null` and `subscribe(listener: () => void): () => void`.
The identifier is a Host-generated cryptographic UUID, public metadata with no
authentication authority. It is neither a credential nor derived from one.
The existing session snapshot owns it; the existing authentication lifecycle
persists a subject-bound descriptor alongside its rotating refresh credential.
Only successful Auth login/refresh can publish a production identity.

A new login always creates a new identifier, even for the same subject. Renewal
and successful reload restoration retain it. A stored descriptor alone never
authenticates anyone. Missing/corrupt metadata or a subject mismatch receive a
fresh identifier only AFTER successful restoration: historical sessions remain
usable, but cannot recover an old Sales intent under an invented owner. Failed
storage writes fail authentication closed; inaccessible storage cannot prevent
in-memory logout. Only Host-owned keys are removed, never global storage.

Snapshots are committed before synchronous notifications. Logout/invalidation
publishes both nulls before notifying, including subscriptions retained by an
unmounted remote. Listener errors are isolated; unsubscribe is idempotent.
Generation checks continue to reject late login, refresh and protected replies.
Subscriptions expose no credentials and grant no authentication operation.

Alternatives: subject-only identity cannot distinguish logins by one person;
token-derived identity leaks credential relationships and changes on rotation;
memory-only UUID loses reload recovery. Backend lookup or Host-owned intent
storage would expand contracts and ownership unnecessarily. This implementation
uses the existing tab session lifecycle and adds only noncredential metadata.

No cross-tab coordination exists in Front. sessionStorage is tab-scoped; cloned
tabs, deletion/tampering and lost rotating responses do not have cross-tab
recovery guarantees. The identifier is not an authorization boundary. Services
remain responsible for identity, permissions and idempotency. Sales' proposed
24-hour journal deadline is not validated against Workflow retention here.

Customers keeps its exact ShellContract v1 identity adapter, assigned as a
custom-element property after registration and on Host route changes. Products
keeps `session.user()` and the shared transport. Auth uses the independent
token-free authentication facade. No portal source changes are required.
