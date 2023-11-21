module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended"
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    "quotes": "off",
    "no-unused-vars": "off",
    "no-undef": "off",
    "no-useless-escape": "off",
    "no-case-declarations": "off"
  },
};
