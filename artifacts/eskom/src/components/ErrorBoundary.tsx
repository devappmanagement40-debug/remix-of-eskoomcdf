import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    // Auto-recover after 3 seconds if error count is low
    if (this.state.hasError && !prevState.hasError && this.state.errorCount < 3) {
      setTimeout(() => {
        this.setState((s) => ({
          hasError: false,
          error: null,
          errorCount: s.errorCount + 1,
        }));
      }, 2000);
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorCount: 0 });
    window.location.href = "/";
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      // If we've auto-retried enough, show full error page
      if (this.state.errorCount >= 3) {
        return (
          <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">
              Une erreur est survenue
            </h1>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              L'application a rencontré un problème inattendu. Veuillez recharger la page.
            </p>
            <button
              onClick={this.handleReload}
              className="gradient-button text-foreground font-semibold py-3 px-8 rounded-xl text-sm"
            >
              Recharger la page
            </button>
          </div>
        );
      }

      // Auto-recovering: show nothing (will auto-retry)
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
