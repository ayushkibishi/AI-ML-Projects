import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught a rendering crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-netflix-black text-red-500 min-h-screen flex flex-col justify-center items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 text-2xl font-bold mb-2">
            ⚠️
          </div>
          <h1 className="text-2xl font-black text-white">Application Render Crash</h1>
          <p className="text-sm font-semibold bg-white/5 border border-white/10 p-4 rounded-xl text-gray-300 max-w-xl text-left overflow-x-auto whitespace-pre-wrap font-mono">
            {this.state.error?.toString()}
          </p>
          {this.state.errorInfo && (
            <details className="w-full max-w-xl text-left text-xs text-gray-500 border border-white/5 bg-white/[0.01] rounded-xl p-3">
              <summary className="cursor-pointer font-bold select-none text-gray-400">View Component Stack Trace</summary>
              <pre className="mt-2 overflow-x-auto leading-normal text-[10px]">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <button 
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            className="mt-4 px-5 py-3 bg-netflix-red hover:bg-red-700 text-white font-bold text-sm rounded-xl transition shadow-lg active:scale-95"
          >
            Reload Platform
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
