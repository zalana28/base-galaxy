import React from 'react';

/**
 * React Error Boundary that catches errors in child components.
 * Prevents the entire app from crashing when a single component fails.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="overlay" style={{ zIndex: 100 }}>
          <div className="panel">
            <h1 style={{ color: 'var(--danger)' }}>ERROR</h1>
            <h2>Something went wrong</h2>
            <p className="small">{this.state.error?.message || 'Unknown error'}</p>
            <button onClick={() => window.location.reload()}>RELOAD APP</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
