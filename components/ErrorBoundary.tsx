"use client";

import { Component, ReactNode } from "react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error("Error boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-96 p-8 gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-destructive-100 mb-2">
              Something went wrong
            </h2>
            <p className="text-muted-foreground">
              We encountered an unexpected error. Please try again.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <p className="mt-4 text-sm text-left bg-dark-200 p-4 rounded-lg overflow-auto max-w-2xl">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className="flex gap-4">
            <Button
              onClick={() => this.setState({ hasError: false, error: null })}
              variant="secondary"
            >
              Try Again
            </Button>
            <Button onClick={() => (window.location.href = "/")} variant="default">
              Go Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
