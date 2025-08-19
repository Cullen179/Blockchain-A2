import { ElementType, ComponentPropsWithoutRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

type TypographyVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';

const TYPOGRAPHY_STYLES: Record<TypographyVariant, string> = {
  h1: 'text-4xl font-bold',
  h2: 'text-3xl font-bold',
  h3: 'text-2xl font-bold',
  h4: 'text-xl font-bold',
  h5: 'text-lg font-bold',
  h6: 'text-base font-bold',
  p: 'text-base',
};

const typographyVariants = cva('', {
  variants: {
    variant: TYPOGRAPHY_STYLES,
  },
});

/**
 * Helper type that maps a typography variant to its corresponding HTML element.
 * For example:
 * - 'h1' maps to 'h1' HTML element
 * - 'p' maps to 'p' HTML element
 */
type VariantToElement<T extends TypographyVariant> = T extends 'p'
  ? 'p'
  : T extends `h${infer N}`
    ? `h${N}`
    : never;

/**
 * Props for the Typography component.
 *
 * This type combines three things:
 * 1. The native HTML props for the element being rendered (based on the variant)
 *    - For example, if variant is 'h1', it includes all props for an <h1> element
 * 2. The styling variants from class-variance-authority (excluding 'variant' which we handle separately)
 * 3. A required 'variant' prop that determines which typography style and HTML element to use
 *
 * @template T - The specific typography variant being used (h1, h2, p, etc.)
 */
type TypographyProps<T extends TypographyVariant> = ComponentPropsWithoutRef<
  VariantToElement<T>
> &
  Omit<VariantProps<typeof typographyVariants>, 'variant'> & {
    variant: T;
  };

/**
 * Typography component that renders text with consistent styling based on its semantic role.
 *
 * @example
 * <Typography variant="h1">Page Title</Typography>
 * <Typography variant="p">Regular paragraph text</Typography>
 */
function Typography<T extends TypographyVariant>({
  className,
  variant,
  ...props
}: TypographyProps<T>) {
  const Component = variant as ElementType;

  return (
    <Component
      className={cn(typographyVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Typography, type TypographyProps };
