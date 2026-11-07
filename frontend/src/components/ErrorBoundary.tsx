"use client";

import React, { ReactNode, ReactElement } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { THEME } from "@/lib/theme";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactElement;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * Catches errors in child components and displays fallback UI
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="h-6 w-6" />
              <h1 className="text-lg font-semibold">
                Oups! Une erreur s'est produite
              </h1>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              L'application a rencontré une erreur inattendue. Veuillez
              réessayer.
            </p>

            {process.env.NODE_ENV === "development" && (
              <details className="mb-4 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                <summary className="cursor-pointer font-mono text-red-600">
                  Détails de l'erreur
                </summary>
                <pre className="mt-2 text-gray-700 whitespace-pre-wrap-break-words">
                  {this.state.error.message}
                  {"\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex gap-2">
              <Button
                onClick={this.resetError}
                className="flex-1 gap-2"
                style={{ backgroundColor: THEME.PRIMARY }}
              >
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </Button>
              <Button
                onClick={() => (window.location.href = "/")}
                variant="outline"
                className="flex-1"
              >
                Accueil
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
