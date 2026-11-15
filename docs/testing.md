# Testing

Detailed procedures and delivery notes moved from the repository README at
[source 0e59f5f](https://github.com/code-corhuila/synkro-front/blob/0e59f5f4d96959eac253c4769d964e22046a79e8/README.md).
Recorded execution results retain their original scope; moving them does not
constitute a new execution or certify a different revision.

Run commands from the repository root unless a step explicitly changes directory.

## Running the tests

```bash
npm test            # the tests
npm run coverage    # the tests with coverage; fails below the 70% statements floor
npm run lint
```

## Continuous integration

`.github/workflows/ci.yml` runs on pushes and pull requests to `develop`, `qa` and `main`, on Node 22
with `npm ci`: the common-files check, `lint` (`npm run lint`), `build` (`npm run build`, then
`npm run check:production-build`) and `test` (`npm run coverage`, which enforces the 70% statements
floor from `testing-strategy.md`).
