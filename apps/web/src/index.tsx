import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

const renderApp = (): void => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

/**
 * MSW toggle:
 * - Default: enabled in development (NODE_ENV === 'development').
 * - Override: set REACT_APP_USE_MSW to 'true' or 'false' to force enable/disable
 *   (useful for preview deployments). CRA exposes only REACT_APP_* vars.
 */
const enableMSW =
  typeof process.env.REACT_APP_USE_MSW !== 'undefined'
    ? process.env.REACT_APP_USE_MSW === 'true'
    : process.env.NODE_ENV === 'development';

if (enableMSW) {
  import('./mocks/browser')
    .then(({ startWorker }) => startWorker())
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('MSW failed to start, continuing without mocks.', err);
    })
    .finally(() => {
      renderApp();
    });
} else {
  renderApp();
}
