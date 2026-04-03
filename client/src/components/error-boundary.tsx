import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

function generateErrorId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'ERR-';
  for (let i = 0; i < 5; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private unlisten?: () => void;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorId: generateErrorId() };
  }

  componentDidMount() {
    // Auto-reset on any navigation so transient errors during route transitions don't stick.
    // Wouter uses pushState (not popstate), so we patch both.
    const reset = () => {
      if (this.state.hasError) {
        this.setState({ hasError: false, error: undefined, errorId: undefined });
      }
    };

    window.addEventListener('popstate', reset);

    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    history.pushState = (...args) => { origPush(...args); reset(); };
    history.replaceState = (...args) => { origReplace(...args); reset(); };

    this.unlisten = () => {
      window.removeEventListener('popstate', reset);
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }

  componentWillUnmount() {
    this.unlisten?.();
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <CardTitle className="text-xl">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                The application encountered an unexpected error. Please try refreshing the page.
              </p>
              {this.state.errorId && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Reference: {this.state.errorId}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => this.setState({ hasError: false, error: undefined, errorId: undefined })}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
