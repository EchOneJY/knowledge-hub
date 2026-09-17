import type { OxlintConfig } from 'oxlint';

const testFiles = [
  '**/__tests__/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}',
  '**/*.{spec,test}.{js,cjs,mjs,jsx,ts,cts,mts,tsx}',
  '**/*.{bench,benchmark}.{js,cjs,mjs,jsx,ts,cts,mts,tsx}',
];

const test: OxlintConfig = {
  overrides: [
    {
      files: testFiles,
      rules: {
        'jest/no-conditional-expect': 'off',
        'jest/require-to-throw-message': 'off',
        'no-console': 'off',
        'vitest/consistent-test-it': [
          'error',
          {
            fn: 'it',
            withinDescribe: 'it',
          },
        ],
        'vitest/hoisted-apis-on-top': 'off',
        'vitest/no-focused-tests': 'error',
        'vitest/no-identical-title': 'error',
        'vitest/no-import-node-test': 'error',
        'vitest/prefer-hooks-in-order': 'error',
        'vitest/prefer-lowercase-title': 'off',
        'vitest/require-mock-type-parameters': 'off',
      },
    },
  ],
};

export { test };
