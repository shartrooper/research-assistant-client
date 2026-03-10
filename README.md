# Research Assistant Client

A React application for the Research Assistant, built with Vite, TypeScript, and Tailwind CSS.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- npm or another package manager

## Initialization & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run the Development Server**
   ```bash
   npm run dev
   ```
   This will start the Vite development server and provide a local URL to view the app in your browser.

## Available Scripts

- `npm run dev`: Starts the local development server.
- `npm run build`: Type-checks the code and builds the production bundle.
- `npm run preview`: Previews the production build locally.
- `npm run lint`: Runs ESLint to check for code issues.
- `npm run test`: Runs the test suite using Vitest.

## Development Guidelines

1. **Plan**: Define scope and tests before writing code.
2. **Red**: Write failing tests first.
3. **Green**: Implement the minimum needed to pass the tests.
4. **Refactor**: Improve the code without regression.
5. **Commit**: Commit at each stable green state.

## Tech Stack

- **UI Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS, PostCSS
- **Data Fetching/State**: React Query
- **Websockets**: react-use-websocket
- **Testing**: Vitest, React Testing Library