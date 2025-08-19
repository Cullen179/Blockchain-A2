'use client';

import { ErrorBoundary } from 'react-error-boundary';
import { Typography } from '@/components/ui/typography';
import { Button } from './ui/button';
import { Card } from './ui/card';

export interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
  message?: string;
}

export function DefaultErrorFallback({
  error,
  resetErrorBoundary,
  message,
}: ErrorFallbackProps) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <Typography variant="p">
        {error?.message || message || 'An unknown error occurred'}
      </Typography>
      <Button
        onClick={resetErrorBoundary}
        variant={'outline'}
        className="w-fit"
      >
        Retry
      </Button>
    </Card>
  );
}

interface ErrorWrapperProps {
  children: React.ReactNode;
  FallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  message?: string;
  resetKeys?: Array<string | number>; // Add reset keys
}

export default function ErrorWrapper({
  children,
  FallbackComponent = DefaultErrorFallback,
  message,
  resetKeys = [],
}: ErrorWrapperProps) {
  return (
    <ErrorBoundary
      FallbackComponent={props => (
        <FallbackComponent {...props} message={message} />
      )}
      resetKeys={resetKeys} // Pass reset keys to ErrorBoundary
    >
      {children}
    </ErrorBoundary>
  );
}
