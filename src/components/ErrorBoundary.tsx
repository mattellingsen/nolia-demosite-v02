"use client";

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('ErrorBoundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary componentDidCatch:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      if (FallbackComponent && this.state.error) {
        return <FallbackComponent error={this.state.error} />;
      }

      return (
        <div className="p-8 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-red-600 mb-4">An error occurred while rendering this component.</p>
          {this.state.error && (
            <details className="text-sm">
              <summary className="cursor-pointer text-red-700 font-medium">Error details</summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple fallback component for query errors
export const QueryErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
    <h3 className="text-lg font-semibold text-yellow-800 mb-2">Query Error</h3>
    <p className="text-yellow-700 mb-2">Failed to load data from the server.</p>
    <details className="text-sm">
      <summary className="cursor-pointer text-yellow-700 font-medium">Error details</summary>
      <pre className="mt-2 p-2 bg-yellow-100 rounded text-xs overflow-auto">
        {error.message}
      </pre>
    </details>
  </div>
);