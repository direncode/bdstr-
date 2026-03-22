"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
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

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4" role="alert">
          <h1 className="text-white text-2xl font-bold">Something went wrong</h1>
          <p className="text-white/60 mt-2 text-center max-w-sm">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = "/";
            }}
            className="mt-6 bg-banditos-red text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors"
          >
            Go Home
          </button>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="mt-3 text-white/40 text-sm hover:text-white/60"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
