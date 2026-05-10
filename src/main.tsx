import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AgendaView } from './components/AgendaView';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

createRoot(root).render(
  <StrictMode>
    <AgendaView />
  </StrictMode>,
);
