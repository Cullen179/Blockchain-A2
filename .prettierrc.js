module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  tabWidth: 2,
  bracketSpacing: true,
  arrowParens: 'avoid',
  plugins: ['prettier-plugin-tailwindcss'],
  importOrder: ['^react', '^next', '^@/', '^[./]'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};
