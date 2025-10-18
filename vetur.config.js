/**
 * Vetur configuration for monorepo.
 * Points Vetur to the Vue project under apps/audit-agent-frontend.
 */
// eslint-disable-next-line no-undef
module.exports = {
  projects: [
    {
      // Root of the frontend Vue project
      root: './apps/audit-agent-frontend',
      // Ensure Vetur picks up dependencies and config from this package
      package: './package.json',
      // Use jsconfig for JS projects (Vetur supports jsconfig or tsconfig)
      jsconfig: './jsconfig.json'
    }
  ]
};

