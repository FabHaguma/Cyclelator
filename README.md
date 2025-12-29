# Cyclelator v2.1

Cyclelator v2.1 is a web-based menstrual cycle tracking system designed for a **single administrator** to manage and monitor menstrual cycles for multiple individuals. The application emphasizes clarity, predictability, and centralized control.

## Features

- **Single Admin Model**: One user manages all profiles.
- **Guest Mode**: Usable immediately upon load with a Standard Model (28-day cycle) without data persistence.
- **Profile Management**:
  - Create, rename, and delete profiles.
  - Assign avatar colors for identification.
  - Manage cycle history.
  - Set manual cycle length overrides.
- **Cycle Calculations**:
  - **Standard Model**: Fixed 28-day cycle.
  - **Adaptive Prediction**: Uses the average of the last 3 recorded cycles.
  - **Manual Override**: Forces a fixed cycle length.
  - **Derived Values**: Automatically calculates Ovulation Day and Dangerous Zone.
- **Persistent Ordering**: Reorder profiles within the list.

## Tech Stack

### Client
- **Framework**: React (v19)
- **Build Tool**: Vite
- **Language**: TypeScript
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Styling**: CSS Modules

### Server
- **Runtime**: Node.js
- **Framework**: Express
- **Database**: SQLite3
- **Language**: TypeScript

## Getting Started

### Prerequisites
- Node.js installed on your machine.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd Cyclelator
    ```

2.  **Install Client Dependencies:**
    ```bash
    cd client
    npm install
    ```

3.  **Install Server Dependencies:**
    ```bash
    cd ../server
    npm install
    ```

### Running the Application

1.  **Start the Server:**
    Navigate to the `server` directory and run:
    ```bash
    # Assuming you have ts-node installed globally or use npx
    npx ts-node src/index.ts
    ```
    *Note: Ensure you configure any necessary environment variables if required.*

2.  **Start the Client:**
    Navigate to the `client` directory and run:
    ```bash
    npm run dev
    ```
    The application should now be accessible at the URL provided by Vite (usually `http://localhost:5173`).

## Project Structure

```
Cyclelator/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── styles/         # Global styles and themes
│   │   ├── api.ts          # API integration
│   │   └── ...
│   └── ...
├── server/                 # Express backend
│   ├── src/
│   │   ├── db.ts           # Database connection
│   │   ├── logic.ts        # Business logic
│   │   ├── routes.ts       # API routes
│   │   └── ...
│   └── ...
└── Cyclelator_v2_1_PRD.md  # Product Requirements Document
```

## License

[ISC](server/package.json)
