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
- **HTTP Client**: Native fetch
- **Styling**: CSS Modules

### Server
- **Runtime**: Node.js
- **Framework**: Express
- **Database**: SQLite3
- **Language**: TypeScript

## Run locally

Node.js 22 or newer is recommended. Open two terminals in the Cyclelator folder.

1. Start the API.

   ```powershell
   cd server
   npm install
   npm run dev
   ```

2. Start the frontend in the second terminal, then open http://localhost:5173.

   ```powershell
   cd client
   npm install
   npm run dev
   ```

The frontend proxies API requests to port 3001. SQLite data lives in `server/cyclelator.db`. Set `DB_PATH` on the API process to choose another database. An optional `API_PROXY_TARGET` on the frontend process can point a development preview at a separate API.

## Using the app

- The overview opens with a clearly labelled 28-day example cycle. Choose **Log period** to use your own date. Guest dates stay in memory for the current visit and survive navigation between app pages.
- Select calendar dates to inspect cycle days and estimates. Use **Today** to return to the current date. Keyboard arrow keys move between dates.
- Open **Profiles** to create a saved profile, edit history, choose a color, or set a fixed cycle length. Drag a list handle or use the up/down buttons to save its position.
- Adaptive estimates begin after four recorded starts delimit three completed cycles. A manual override takes priority. Observed historical intervals keep their actual lengths.
- The calendar marks period starts. Period duration is not collected.
- The cycle guide explains the model and links to NHS guidance about fertility awareness.

## Check and build

```powershell
npm --prefix client run build
npm --prefix client run lint
npm --prefix server run check
npm --prefix server run build
```

The production frontend is written to `client/dist` and the compiled API to `server/dist`. Run the compiled API with `npm --prefix server start`.

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

## Design assets

The botanical banner is saved at `client/public/art/iris-study.webp`. It was generated with the built-in ImageGen tool and optimized to WebP for the app. The interface uses locally served DM Sans and Baskervville fonts, with their licenses in `client/public/fonts/`.

The artwork prompt was

> Create a refined editorial botanical illustration for a lavender colored cycle journal app banner. A lush cluster of three large bearded iris flowers, pale lilac, saturated amethyst-purple, muted plum and ivory, in full bloom with undulating delicately ridged petals and finely engraved dark-purple ink veins. A couple of small buds, long curling muted sage/olive spear leaves and slender crossing stems going to the lower right. Painterly gouache mixed with hand-tinted vintage botanical engraving on perfectly even pale lavender paper (#eae3f3). No visible rectangular plate border, no vase, no lettering, numbers or labels. Wide landscape 3:2 art, flowers stretching from middle bottom to right and upper right, flower heads facing different directions and cropping gracefully at the right and bottom edges. Have the top of the central flower fully visible. The far left quarter is empty pale lavender, stems appear from bottom. Quiet luxury, natural detailed botanical study, not flat vector or 3D or photograph. The flowers must be large and sculptural and intricate even in a small banner.
