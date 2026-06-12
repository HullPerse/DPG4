import { Component, type ReactNode } from "react";
import { BigError } from "@/components/shared/error.component";
import { GlobeX } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
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

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <BigError
          error={this.state.error ?? new Error("Unknown error")}
          icon={<GlobeX className="size-28 text-red-500" />}
          button
        />
      );
    }

    return this.props.children;
  }
}
