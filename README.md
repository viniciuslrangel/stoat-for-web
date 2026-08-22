# stoat-web

React rewrite of the Stoat web client. Single page app, no server runtime.

Target instance is `https://stoat.viniciusrangel.dev`, registration is invite only.

## Scope

`FEATURES.md` is the work list. It inventories every feature the old Solid client shipped, derived from the explorer audits in `.audit/explorers/`. A checked box means this rewrite already implements it. Placeholder routes do not count.

`docs/product.md` is the Discord UX contract.

## Stack

React 19, TypeScript, Vite through the vite-plus (`vp`) CLI, TanStack Router with file-based routes, TanStack Query, Jotai, Tailwind CSS v4, Base UI primitives, Biome.

## Commands

```bash
pnpm install
pnpm dev             # vp dev on port 3000
pnpm build           # vp build
pnpm preview         # vp preview
pnpm test            # vp test
pnpm check           # biome check
pnpm lint            # biome lint
pnpm format          # biome format
pnpm generate-routes # regenerate src/routeTree.gen.ts
```

## State split

Server state belongs to TanStack Query. Anything fetched from the API is a query or mutation, keyed by resource. The cache is the only copy.

Client state belongs to Jotai atoms in `src/domain`. Session status, layout, drafts, voice settings, and other local concerns live there. Never mirror query data into an atom.

Realtime updates from the websocket write into the query cache, not into a parallel store.

## Layout

```
src/app        providers
src/components components, with ui/ holding the primitives
src/domain     ids, branded types, screen inventory, client state
src/hooks      useSyncExternalStore hooks
src/lib        env and helpers
src/routes     file-based routes
```

Routes are declared in `src/domain/screens.ts`. `scripts/generate-screen-routes.mjs` writes placeholder route files from that list.
