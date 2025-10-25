export default {
  root: true,
  env: { node: true, browser: true, es2021: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    '@vue/eslint-config-prettier'
  ],
  rules: {
    'no-unused-vars': 'warn',
    'no-empty': 'off',
    'no-undef': 'off',
  },
};