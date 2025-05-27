import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    plugins: {
      prettier: prettierPlugin
    },
    rules: {
      ...prettier.rules, // Disables conflicting ESLint rules
      'prettier/prettier': 'error'
    }
  }
)
