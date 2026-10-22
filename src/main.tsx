/**
 * @file App entry point: loads global styles, loads saved data, then
 * renders the app (or an error message if loading fails).
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { startCampaignLink } from './state/campaignLink';
import { startPersistence } from './state/persistence';
import { App } from './ui/App';
import './styles/theme.css';
import './styles/controls.css';
import './styles/layout.css';

/** React root mounted on the #root element in index.html. */
const root = ReactDOM.createRoot(document.getElementById('root')!);

// Render only after data is loaded so nothing can overwrite saved files with empty state.
startPersistence()
  .then(() => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    // Sharing with Encounters starts in the background; it never holds up the app.
    startCampaignLink();
  })
  .catch((err: Error) => {
    root.render(<p className="empty-state">Lorekeeper could not load its notebook: {err.message}</p>);
  });
