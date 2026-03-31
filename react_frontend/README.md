# React Frontend (Budget Planner)

## Overview

This container is a Create React App-based React frontend. In the current repository state, the app renders a basic landing page and includes a light/dark theme toggle implemented with React state and CSS variables.

The budget planner feature set described in the work item (transactions, categories, monthly summaries, charts, localStorage persistence, optional CSV export) is not yet implemented in the current source code. Those requirements are tracked as a specification in the CodeWiki.

## Getting started

From this directory (`react_frontend`):

### Install dependencies

```bash
npm install
```

### Run in development

```bash
npm start
```

Then open:

- http://localhost:3000

### Run tests

```bash
CI=true npm test
```

### Build

```bash
npm run build
```

## Where the current UI is implemented

- `src/App.js`: Main UI component and theme toggle logic.
- `src/App.css`: Light/dark theme CSS variables and component styling.
- `src/index.js`: React entry point.

## Documentation

For container onboarding, architecture, and the budget planner feature specification, see:

- [CodeWiki Home](../../kavia-docs/CodeWiki/index.md)
