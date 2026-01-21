import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/globals.css';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Situation Monitor</h1>
        <p className="text-muted-foreground">Strategic Assessment Platform</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
