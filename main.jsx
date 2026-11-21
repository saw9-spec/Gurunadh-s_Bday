import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import GurunadhExperience from './gurunadhexperience.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GurunadhExperience />
  </StrictMode>
);
