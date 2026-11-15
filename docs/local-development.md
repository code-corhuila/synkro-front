# Local development

Detailed procedures and delivery notes moved from the repository README at
[source 0e59f5f](https://github.com/code-corhuila/synkro-front/blob/0e59f5f4d96959eac253c4769d964e22046a79e8/README.md).
Recorded execution results retain their original scope; moving them does not
constitute a new execution or certify a different revision.

Run commands from the repository root unless a step explicitly changes directory.

## Running locally

Node 22 (`.nvmrc`; `nvm use`).

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and adjust `VITE_API_BASE_URL` if the gateway is not on
`http://localhost:8000`.
