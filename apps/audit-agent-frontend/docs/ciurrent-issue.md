Issue: 1 — ❗️ RESOLVED

[nodemon] watching path(s): *.*
[nodemon] watching extensions: teams,json
[nodemon] starting `node --env-file .env.teams app.example.js`
node:internal/modules/esm/resolve:283
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/abhishekkumarjha/Documents/audit-agent/src/services/inviteService.js' imported from /Users/abhishekkumarjha/Documents/audit-agent/src/api/orgs/inviteRouter.js
    at finalizeResolution (node:internal/modules/esm/resolve:283:11)
    at moduleResolve (node:internal/modules/esm/resolve:952:10)
    at defaultResolve (node:internal/modules/esm/resolve:1188:11)
    at ModuleLoader.defaultResolve (node:internal/modules/esm/loader:708:12)
    at #cachedDefaultResolve (node:internal/modules/esm/loader:657:25)
    at ModuleLoader.resolve (node:internal/modules/esm/loader:640:38)
    at ModuleLoader.getModuleJobForImport (node:internal/modules/esm/loader:264:38)
    at ModuleJob._link (node:internal/modules/esm/module_job:168:49) {
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///Users/abhishekkumarjha/Documents/audit-agent/src/services/inviteService.js'
}

Node.js v20.19.5
[nodemon] app crashed - waiting for file changes before starting...

✅ Fix: Updated `/src/api/orgs/inviteRouter.js` to import the Teams invite service from `server/src/services/inviteService.js`.
   - Restarted nodemon → no module errors.

---

Issue: 2 — ❗️ RESOLVED

Side bar not visisble in mobile team layout...

✅ Fix: Added `TeamMobileNav.vue` responsive pill navigation and mounted it in `TeamLayout.vue` for screens ≤ 960px (sidebar still hidden, mobile nav presents routes).

---

Issue 3:

❗️ RESOLVED — Admin analytics router import

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/.../src/server/firebaseAdmin.js'
```

✅ Fix: Corrected path in `/src/api/admin/analyticsRouter.js` to use `../../../server/firebaseAdmin.js`.
   - Nodemon restart confirms server boots without module errors.

---

Issue 4 — ❗️ RESOLVED

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../apps/backend-node/src/services/inviteService.js'
```

✅ Fix: Updated `/src/api/public/inviteRouter.js` to import from `../../../server/src/services/inviteService.js` (same source of truth as org router).
   - Nodemon restart: backend starts without module errors.
