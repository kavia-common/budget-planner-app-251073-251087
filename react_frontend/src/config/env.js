/**
 * @file env.js
 * Centralized access to environment configuration.
 *
 * CRA only exposes env vars prefixed with REACT_APP_.
 */

// PUBLIC_INTERFACE
export function getEnv() {
  /** This is a public function. */
  return {
    apiBase: process.env.REACT_APP_API_BASE || '',
    backendUrl: process.env.REACT_APP_BACKEND_URL || '',
    frontendUrl: process.env.REACT_APP_FRONTEND_URL || '',
    wsUrl: process.env.REACT_APP_WS_URL || '',
    nodeEnv: process.env.REACT_APP_NODE_ENV || process.env.NODE_ENV || 'development',
    logLevel: process.env.REACT_APP_LOG_LEVEL || 'info',
    healthcheckPath: process.env.REACT_APP_HEALTHCHECK_PATH || '/health',
    featureFlags: process.env.REACT_APP_FEATURE_FLAGS || '',
    experimentsEnabled: process.env.REACT_APP_EXPERIMENTS_ENABLED === 'true',
  };
}

