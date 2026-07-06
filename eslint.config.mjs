import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig({
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
    rules: {
        '@typescript-eslint/no-empty-object-type': 0,
        '@typescript-eslint/no-explicit-any': 0
    }
});
