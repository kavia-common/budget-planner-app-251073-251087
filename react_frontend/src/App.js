import React from 'react';
import './App.css';
import { BudgetPlannerPage } from './features/budgetPlanner/pages/BudgetPlannerPage';

/**
 * @file App.js
 * App entry component (thin shell).
 *
 * The UI/behavior is implemented in feature modules under src/features.
 */

// PUBLIC_INTERFACE
function App() {
  /** This is a public function. */
  return <BudgetPlannerPage />;
}

export default App;

