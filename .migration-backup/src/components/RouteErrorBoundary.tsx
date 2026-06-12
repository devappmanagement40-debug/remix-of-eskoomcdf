import { Component, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class RouteErrorBoundaryInner extends Component<Props & { onNavigateHome: () => void }, State> {
  constructor(props: Props & { onNavigateHome: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("Route error:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleHome = () => {
    this.setState({ hasError: false });
    this.props.onNavigateHome();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-lg font-bold text-foreground mb-2">
            Erreur de chargement
          </h1>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs">
            Cette page a rencontré un problème. Essayez de réessayer.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="gradient-button text-foreground font-semibold py-2.5 px-6 rounded-xl text-sm"
            >
              Réessayer
            </button>
            <button
              onClick={this.handleHome}
              className="bg-secondary text-foreground font-semibold py-2.5 px-6 rounded-xl text-sm border border-border/30"
            >
              Accueil
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const RouteErrorBoundary = ({ children }: Props) => {
  const navigate = useNavigate();
  return (
    <RouteErrorBoundaryInner onNavigateHome={() => navigate("/")}>
      {children}
    </RouteErrorBoundaryInner>
  );
};

export default RouteErrorBoundary;
