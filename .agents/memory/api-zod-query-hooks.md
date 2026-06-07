---
name: Generated query hooks require queryKey
description: Orval-generated useGet* hooks in this repo need queryKey when passing query options.
---

When calling a generated `useGet*` hook (from `@workspace/api-client-react`) and you
pass a `query` options object, TypeScript requires `queryKey` — the generated
`UseQueryOptions` is NOT `Partial`, so omitting it fails with TS2741.

**How to apply:** import the matching `getGet*QueryKey` helper and pass it:
```ts
useGetPrimeRate({ query: { queryKey: getGetPrimeRateQueryKey(), retry: false } });
```
Or call the hook with no options at all (`useGetPrimeRate()`), which is also valid.

**Why:** Orval emits `query?: UseQueryOptions<...>` (non-partial). It took a failed
leaf typecheck to surface; passing the query-key helper is the clean fix.
