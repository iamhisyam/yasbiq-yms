<!-- intent-skills:start -->
# Skill mappings - load `use` with `pnpm dlx @tanstack/intent@latest load <use>`.
skills:
  - when: "Install TanStack Devtools, pick framework adapter (React/Vue/Solid/Preact), register plugins via plugins prop, configure shell (position, hotkeys, theme, hideUntilHover, requireUrlFlag, eventBusConfig). TanStackDevtools component, defaultOpen, localStorage persistence."
    use: "@tanstack/devtools#devtools-app-setup"
  - when: "Publish plugin to npm and submit to TanStack Devtools Marketplace. PluginMetadata registry format, plugin-registry.ts, pluginImport (importName, type), requires (packageName, minVersion), framework tagging, multi-framework submissions, featured plugins."
    use: "@tanstack/devtools#devtools-marketplace"
  - when: "Build devtools panel components that display emitted event data. Listen via EventClient.on(), handle theme (light/dark), use @tanstack/devtools-ui components. Plugin registration (name, render, id, defaultOpen), lifecycle (mount, activate, destroy), max 3 active plugins. Two paths: Solid.js core with devtools-ui for multi-framework support, or framework-specific panels."
    use: "@tanstack/devtools#devtools-plugin-panel"
  - when: "Handle devtools in production vs development. removeDevtoolsOnBuild, devDependency vs regular dependency, conditional imports, NoOp plugin variants for tree-shaking, non-Vite production exclusion patterns."
    use: "@tanstack/devtools#devtools-production"
  - when: "Two-way event patterns between devtools panel and application. App-to-devtools observation, devtools-to-app commands, time-travel debugging with snapshots and revert. structuredClone for snapshot safety, distinct event suffixes for observation vs commands, serializable payloads only."
    use: "@tanstack/devtools-event-client#devtools-bidirectional"
  - when: "Create typed EventClient for a library. Define event maps with typed payloads, pluginId auto-prepend namespacing, emit()/on()/onAll()/onAllPluginEvents() API. Connection lifecycle (5 retries, 300ms), event queuing, enabled/disabled state, SSR fallbacks, singleton pattern. Unique pluginId requirement to avoid event collisions."
    use: "@tanstack/devtools-event-client#devtools-event-client"
  - when: "Analyze library codebase for critical architecture and debugging points, add strategic event emissions. Identify middleware boundaries, state transitions, lifecycle hooks. Consolidate events (1 not 15), debounce high-frequency updates, DRY shared payload fields, guard emit() for production. Transparent server/client event bridging."
    use: "@tanstack/devtools-event-client#devtools-instrumentation"
  - when: "Configure @tanstack/devtools-vite for source inspection (data-tsd-source, inspectHotkey, ignore patterns), console piping (client-to-server, server-to-client, levels), enhanced logging, server event bus (port, host, HTTPS), production stripping (removeDevtoolsOnBuild), editor integration (launch-editor, custom editor.open). Must be FIRST plugin in Vite config. Vite ^6 || ^7 only."
    use: "@tanstack/devtools-vite#devtools-vite-plugin"
  - when: "Step-by-step migration from Next.js App Router to TanStack Start: route definition conversion, API mapping, server function conversion from Server Actions, middleware conversion, data fetching pattern changes."
    use: "@tanstack/react-start#lifecycle/migrate-from-nextjs"
  - when: "React bindings for TanStack Start: createStart, StartClient, StartServer, React-specific imports, re-exports from @tanstack/react-router, full project setup with React, useServerFn hook."
    use: "@tanstack/react-start#react-start"
  - when: "Implement, review, debug, and refactor TanStack Start React Server Components in React 19 apps. Use when tasks mention @tanstack/react-start/rsc, renderServerComponent, createCompositeComponent, CompositeComponent, renderToReadableStream, createFromReadableStream, createFromFetch, Composite Components, React Flight streams, loader or query owned RSC caching, router.invalidate, structuralSharing: false, selective SSR, stale names like renderRsc or .validator, or migration from Next App Router RSC patterns. Do not use for generic SSR or non-TanStack RSC frameworks except brief comparison."
    use: "@tanstack/react-start#react-start/server-components"
  - when: "Framework-agnostic core concepts for TanStack Router: route trees, createRouter, createRoute, createRootRoute, createRootRouteWithContext, addChildren, Register type declaration, route matching, route sorting, file naming conventions. Entry point for all router skills."
    use: "@tanstack/router-core#router-core"
  - when: "Route protection with beforeLoad, redirect()/throw redirect(), isRedirect helper, authenticated layout routes (_authenticated), non-redirect auth (inline login), RBAC with roles and permissions, auth provider integration (Auth0, Clerk, Supabase), router context for auth state."
    use: "@tanstack/router-core#router-core/auth-and-guards"
  - when: "Automatic code splitting (autoCodeSplitting), .lazy.tsx convention, createLazyFileRoute, createLazyRoute, lazyRouteComponent, getRouteApi for typed hooks in split files, codeSplitGroupings per-route override, splitBehavior programmatic config, critical vs non-critical properties."
    use: "@tanstack/router-core#router-core/code-splitting"
  - when: "Route loader option, loaderDeps for cache keys, staleTime/gcTime/ defaultPreloadStaleTime SWR caching, pendingComponent/pendingMs/ pendingMinMs, errorComponent/onError/onCatch, beforeLoad, router context and createRootRouteWithContext DI pattern, router.invalidate, Await component, deferred data loading with unawaited promises."
    use: "@tanstack/router-core#router-core/data-loading"
  - when: "Link component, useNavigate, Navigate component, router.navigate, ToOptions/NavigateOptions/LinkOptions, from/to relative navigation, activeOptions/activeProps, preloading (intent/viewport/render), preloadDelay, navigation blocking (useBlocker, Block), createLink, linkOptions helper, scroll restoration, MatchRoute."
    use: "@tanstack/router-core#router-core/navigation"
  - when: "notFound() function, notFoundComponent, defaultNotFoundComponent, notFoundMode (fuzzy/root), errorComponent, CatchBoundary, CatchNotFound, isNotFound, NotFoundRoute (deprecated), route masking (mask option, createRouteMask, unmaskOnReload)."
    use: "@tanstack/router-core#router-core/not-found-and-errors"
  - when: "Dynamic path segments ($paramName), splat routes ($ / _splat), optional params ({-$paramName}), prefix/suffix patterns ({$param}.ext), useParams, params.parse/stringify, pathParamsAllowedCharacters, i18n locale patterns."
    use: "@tanstack/router-core#router-core/path-params"
  - when: "validateSearch, search param validation with Zod/Valibot/ArkType adapters, fallback(), search middlewares (retainSearchParams, stripSearchParams), custom serialization (parseSearch, stringifySearch), search param inheritance, loaderDeps for cache keys, reading and writing search params."
    use: "@tanstack/router-core#router-core/search-params"
  - when: "Non-streaming and streaming SSR, RouterClient/RouterServer, renderRouterToString/renderRouterToStream, createRequestHandler, defaultRenderHandler/defaultStreamHandler, HeadContent/Scripts components, head route option (meta/links/styles/scripts), ScriptOnce, automatic loader dehydration/hydration, memory history on server, data serialization, document head management."
    use: "@tanstack/router-core#router-core/ssr"
  - when: "Full type inference philosophy (never cast, never annotate inferred values), Register module declaration, from narrowing on hooks and Link, strict:false for shared components, getRouteApi for code-split typed access, addChildren with object syntax for TS perf, LinkProps and ValidateLinkOptions type utilities, as const satisfies pattern."
    use: "@tanstack/router-core#router-core/type-safety"
  - when: "TanStack Router bundler plugin for route generation and automatic code splitting. Supports Vite, Webpack, Rspack, and esbuild. Configures autoCodeSplitting, routesDirectory, target framework, and code split groupings."
    use: "@tanstack/router-plugin#router-plugin"
  - when: "Programmatic route tree building as an alternative to filesystem conventions: rootRoute, index, route, layout, physical, defineVirtualSubtreeConfig. Use with TanStack Router plugin's virtualRouteConfig option."
    use: "@tanstack/virtual-file-routes#virtual-file-routes"
  - when: "Load environment variables from a .env file into process.env for Node.js applications. Use when configuring apps with secrets, setting up local development environments, managing API keys and database uRLs, parsing .env file contents, or populating environment variables programmatically. Always use this skill when the user mentions .env, even for simple tasks like \"set up dotenv\" — the skill contains critical gotchas (encrypted keys, variable expansion, command substitution) that prevent common production issues."
    use: "dotenv#dotenv"
  - when: "Use dotenvx to run commands with environment variables, manage multiple .env files, expand variables, and encrypt env files for safe commits and CI/CD."
    use: "dotenv#dotenvx"
<!-- intent-skills:end -->

# Project Notes — Foundation Management

## ISAK 35 Financial Reports — Selesai
- **Neraca**: portrait single-column, comparative (Tahun Ini | Tahun Lalu). Aset neto dihitung dari live tables (bank_account, tagihan_siswa, hutang_piutang, penggajian, aset_tetap, dana). Tahun lalu dari jurnal via `getNeracaDariJurnal`.
- **Penghasilan Komprehensif**: ISAK 35 Format A — sections tanpaPembatasan/denganPembatasan + PKL. Query exclude `tipe = 'penutup'`. Depresiasi dihitung inline dari aset_tetap table.
- **Perubahan Aset Neto**: ISAK 35 vertical — saldo awal, surplus, aset dibebaskan, saldo akhir per klasifikasi. Membaca COA 3.x.x dari jurnalDetail.

## Seed Flow (src/server/seed.ts)
1. `seedUnit(TK)`: Creates TK data (pegawai, siswa, spp, kasTransaksi, aset, dana, hutang)
2. `seedUnit(SD)`: Creates SD data
3. Generate jurnal entries from ALL kasTransaksi (debit kas, credit income / debit expense, credit kas)
4. **Jurnal penyusutan**: Debit 5.1.07, Credit 1.2.06 per-unit (garis_lurus formula)
5. **Dana reklasifikasi**: Debit 3.1.00, Credit 3.2.00/3.3.00 for sisa (target - realisasi) terikat
6. **Jurnal penutup**: Debit pendapatan, credit beban, surplus/deficit → 3.1.00 per-unit
7. **Opening balance catch-up**: computes target COA balances from live tables and journals the delta at 2025-12-31 so PAN total = Neraca total
8. Payroll December is `draft` (utang gaji/pajak/bpjs muncul di Neraca)

## Data Consistency Notes
- Neraca Aset Neto (A - L + dana split) = PAN (COA 3.x.x) — **now consistent** via catch-up entry
- Depresiasi sekarang di-jurnal → PK dan PAN konsisten untuk beban penyusutan
- Dana reklasifikasi membuat PAN menampilkan "Dengan Pembatasan" sesuai neraca
- COA `2.1.05` (Utang Jangka Panjang) added and used by `getNeracaDariJurnal`

## Import Protection — `.server.ts` Convention (Corrected)
- **Do NOT** add `.server.ts` extension to files that export `createServerFn`. Routes import these directly via `#/server/xxx`.
- Use `.server.ts` ONLY for pure server utilities (e.g., DB helpers, shared logic not wrapped in `createServerFn`). These are imported via dynamic `import()` inside handler bodies, not statically.
- The import protection plugin mocks `**/*.server.*` files in client bundles. Static imports of `.server` modules from non-`.server` files trigger build warnings, but are harmless for `createServerFn` files — the mocked exports are only used inside handler bodies, which are tree-shaken from the client bundle.
- Exception: files like `seed.ts` (server-only, not imported by routes) can safely statically import `.server` modules.
- Renamed back: `keuangan.server.ts` → `keuangan.ts` (reverted), routes use `#/server/keuangan`.
- Keep: `keuangan-utils.server.ts`, `beasiswa-utils.server.ts` (pure server utilities).

## Unified Transaction Log — `refType` + `transaksiId`
- Every `kasTransaksi` now has `refType` ('kas'/'spp'/'gaji'/'penyusutan'/'penyesuaian'/'penutup'/'dana') + `refId` linking to source record
- Every `jurnalHeader` now has `transaksiId` FK → `kasTransaksi.id`
- `generateJurnalKas` in `keuangan-utils.server.ts` accepts optional `transaksiId` param and sets it on jurnalHeader
- All callers (tagihan.ts, pegawai.ts, bos.ts, keuangan.ts) capture kasTransaksi id after insert and pass to `generateJurnalKas`
- Kas page has "Sumber" filter (by refType) and badge column showing transaction source
- Seed.ts creates kasTransaksi for ALL journal types (penyusutan, dana, penutup, penyesuaian)

## Key Files
- `src/server/keuangan.ts`: `getLaporanNeraca`, `getLaporanSurplusDefisit`, `getPerubahanAsetNeto`, helpers, `getTransaksiList`, `createTransaksi`, `updateTransaksi`
- `src/server/keuangan-utils.server.ts`: `generateJurnalKas` (now accepts transaksiId)
- `src/server/seed.ts`: `seedDummyData` — full dummy data generator
- `src/server/tagihan.ts`: payment processing with refType='spp'/'kas'
- `src/server/pegawai.ts`: payroll payment with refType='gaji'
- `src/server/bos.ts`: BOS realisasi with refType='kas'
- `src/components/laporan-neraca-pdf.tsx`, `laporan-surplus-defisit-pdf.tsx`
- `src/routes/_dashboard/laporan-keuangan.tsx`: UI for all reports
- `src/routes/_dashboard/keuangan.tsx`: Kas page with refType filter + badge
