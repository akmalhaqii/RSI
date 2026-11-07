import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import TrainingPage from './pages/TrainingPage.jsx';

const root = document.getElementById('app');

if (root) {
    createRoot(root).render(createElement(TrainingPage));
}
