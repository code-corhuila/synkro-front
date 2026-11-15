# Authentication operations readme

Detailed procedures and delivery notes moved from the repository README at
[source 0e59f5f](https://github.com/code-corhuila/synkro-front/blob/0e59f5f4d96959eac253c4769d964e22046a79e8/README.md).
Recorded execution results retain their original scope; moving them does not
constitute a new execution or certify a different revision.

Run commands from the repository root unless a step explicitly changes directory.

## The development sign-in

A pasted token becomes a session. It exists only for Local/Development: it is registered only when
`VITE_DEV_SIGN_IN` is `"true"`, and `synkro-auth-portal` replaces it. **Builds for `qa` and `main` must
have it off.**

With it off, the sign-in code, its strings and the `synkro_dev_token` key (under which a session
survives a reload) are not in the bundle, access lives in memory, and the Host alone stores the rotating refresh in sessionStorage.
`npm run check:production-build` fails if any of them is: run it after `npm run build`. CI runs it on
the build job, and the Dockerfile on the image build. The sign-in's CSS stays in the style bundle.

## Production authentication (HU-FE-08)

The public `/login` route mounts the real Auth remote when development sign-in
is disabled. The additive `shell/authentication` export provides token-free
login outcomes, logout and observable state. Portals keep using the existing
`apiClient` and `session` signatures. Protected requests pass the session gate;
a protected 401 ends the session without refresh/replay, while 403 keeps it.

The Host owns access in memory, refresh in sessionStorage, validation, one
shared renewal and generation invalidation. It checks at <=60 seconds before
expiration, request, focus and visibility boundaries and restores by refresh
after reload. A lost rotating response requires new login without resubmission.
The browser decode only schedules checks; backend validation remains authority.

Production delivery uses `/remotes/auth/` through the Host and internal
`synkro-auth-portal:80`, with no portal port or backend credentials. Empty
`VITE_API_BASE_URL` uses the Host `/api/` Gateway proxy so Retry-After is visible.
The development walkthrough above is optional local verification only.

See [design and human approval](authentication-design.md),
[operational configuration and prepared PRs](authentication-operations.md)
and [verification matrix and TDD limits](authentication-verification.md).
CI also runs on the authorized feature branch and manual dispatch, with existing
read-only permissions and bounded jobs. No PR or permanent-branch promotion
is performed by this delivery.
