module.exports = {
  semi: true,
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  trailingComma: 'es5',
  endOfLine: 'lf',
  plugins: [
    '@trivago/prettier-plugin-sort-imports',
    'prettier-plugin-tailwindcss',
  ],
  importOrder: ['^react', '^next', '^@/', '^[./]'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};
