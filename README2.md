# LabSync

### Smart Laboratory Equipment Discovery, Availability & Booking Platform

LabSync is a modern web platform designed to simplify the way users **discover laboratory equipment, check availability, receive equipment recommendations, and manage bookings** from a centralized interface.

The project combines a modern TypeScript frontend with **Supabase-backed authentication and data services**, providing a foundation for a scalable laboratory equipment management and discovery platform.

> **Personal Project — Ongoing Development**

---

## Overview

Laboratory equipment is often difficult to discover and coordinate across departments, institutions, and facilities. Users may need to manually search equipment inventories, determine availability, communicate with laboratory administrators, and coordinate bookings.

**LabSync** aims to streamline this workflow by bringing equipment discovery, availability, recommendations, authentication, and booking management into one platform.

### Core Workflow

```text
Discover Equipment
        ↓
View Equipment Details
        ↓
Check Availability
        ↓
Get Recommendations
        ↓
Book Equipment
        ↓
Manage Booking
```

---

## Key Features

### 🔬 Equipment Discovery

Browse and explore available laboratory equipment through a structured catalog.

Users can view equipment-specific information and navigate directly to individual equipment pages.

### 📅 Availability Calendar

Check equipment availability through an integrated availability interface.

This helps users identify suitable time slots before creating a booking.

### 📋 Equipment Booking

Authenticated users can manage equipment bookings through the platform.

The application includes dedicated booking routes and authenticated dashboard functionality.

### 🤖 Smart Recommendations

LabSync includes an AI-oriented recommendation layer designed to help users identify suitable laboratory equipment based on their requirements.

The project contains dedicated recommendation functionality and AI service modules.

### 🔐 Authentication

Authentication is integrated into the application with protected routes and authenticated user workflows.

The platform includes:

* User authentication
* Protected application routes
* Authenticated dashboard
* Role-aware functionality
* Authentication utilities

### 👨‍💼 Admin Dashboard

The application includes an authenticated administration area for managing platform-level functionality.

### 🗂️ Equipment Details

Individual equipment pages provide a dedicated view for specific equipment and its associated information.

### 🧪 Laboratory Data Layer

Supabase is used as the project's backend data and authentication infrastructure, with database migrations maintained inside the repository.

---

## Technology Stack

### Frontend

* TypeScript
* React
* Vite
* TanStack Start
* TanStack Router
* Tailwind CSS
* shadcn/ui

### Backend / Application Services

* TypeScript
* TanStack Start
* Server-side application routes

### Database & Backend Services

* Supabase
* PostgreSQL
* Supabase migrations
* Supabase Authentication

### AI

* AI-powered equipment recommendation functionality
* AI service functions

### Development Tools

* npm
* Bun configuration
* ESLint
* Prettier
* Git
* GitHub

---

## Architecture

```text
┌──────────────────────────────────────┐
│             LabSync UI               │
│                                      │
│ React + TypeScript + Tailwind        │
│ TanStack Router / Start              │
└───────────────────┬──────────────────┘
                    │
                    │ Application / Server
                    ▼
┌──────────────────────────────────────┐
│          Application Services        │
│                                      │
│ Authentication                       │
│ Equipment Catalog                    │
│ Availability                         │
│ Bookings                             │
│ Recommendations                      │
│ Role Management                      │
└───────────────────┬──────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│              Supabase                │
│                                      │
│ PostgreSQL                           │
│ Authentication                       │
│ Database Migrations                  │
└──────────────────────────────────────┘
```

---

## Project Structure

```text
LabSync/
│
├── public/
│   ├── favicon.ico
│   └── robots.txt
│
├── src/
│   ├── components/
│   │   ├── AppHeader.tsx
│   │   ├── AvailabilityCalendar.tsx
│   │   ├── EquipmentCard.tsx
│   │   └── ui/
│   │
│   ├── hooks/
│   │   ├── useAuth.tsx
│   │   ├── useCatalog.ts
│   │   ├── useRole.ts
│   │   └── use-mobile.tsx
│   │
│   ├── integrations/
│   │   └── supabase/
│   │
│   ├── lib/
│   │   ├── ai.functions.ts
│   │   ├── catalog.functions.ts
│   │   ├── labsync.ts
│   │   └── labsync.test.ts
│   │
│   ├── routes/
│   │   ├── _authenticated/
│   │   ├── auth.tsx
│   │   ├── equipment.$id.tsx
│   │   ├── index.tsx
│   │   └── recommend.tsx
│   │
│   ├── router.tsx
│   ├── server.ts
│   ├── start.ts
│   └── styles.css
│
├── supabase/
│   ├── config.toml
│   └── migrations/
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
```

---

## Main Application Modules

### Equipment Catalog

Centralized equipment discovery and equipment-specific information.

### Availability

Calendar-based equipment availability to help users identify suitable booking windows.

### Recommendations

Recommendation functionality intended to assist users in selecting equipment appropriate for their requirements.

### Bookings

Authenticated booking workflows for reserving laboratory equipment.

### Authentication

Authentication utilities, protected routes, and user-specific application experiences.

### Dashboard

Authenticated dashboard functionality for managing user workflows.

### Administration

Dedicated administrative routes for platform management.

---

## Getting Started

### Prerequisites

Install:

* Node.js
* npm
* A Supabase project

### Clone the Repository

```bash
git clone https://github.com/RajG1205/labsync.git

cd labsync
```

### Install Dependencies

```bash
npm install
```

### Environment Configuration

Create a local environment file based on the provided example:

```bash
.env.example
```

Copy it to:

```text
.env
```

Then configure the required Supabase and application environment variables.

> Never commit `.env` or production credentials to GitHub.

### Start Development Server

```bash
npm run dev
```

The application will start using the project's Vite/TanStack development configuration.

---

## Database

LabSync uses **Supabase** for its backend data layer.

Database migrations are maintained in:

```text
supabase/migrations/
```

This allows the database structure to be version-controlled alongside the application source code.

---

## Testing

The repository contains application-level testing code, including:

```text
src/lib/labsync.test.ts
```

Testing can be expanded as additional booking, availability, recommendation, authentication, and catalog workflows are implemented.

---

## Security

The repository intentionally excludes local environment files through `.gitignore`.

Sensitive configuration should be stored locally through environment variables.

Do not commit:

```text
.env
.env.local
API keys
Supabase service-role keys
Database credentials
Private tokens
```

Use:

```text
.env.example
```

as the configuration template.

---

## Development Status

🚧 **Active Development**

LabSync is an ongoing project and its architecture and feature set are still evolving.

Current development areas include:

* Equipment discovery
* Availability management
* Booking workflows
* Recommendation functionality
* Authentication
* Dashboard functionality
* Administrative workflows
* Supabase integration

---

## Roadmap

### Equipment Intelligence

* Semantic equipment search
* Natural-language equipment discovery
* More advanced experiment-to-equipment matching
* Improved recommendation ranking

### Booking

* Advanced availability management
* Booking conflict detection
* Booking notifications
* Calendar integrations

### Laboratory Management

* Laboratory and facility management
* Equipment maintenance tracking
* Equipment utilization analytics
* Administrative reporting

### AI

* Experiment description → equipment recommendations
* Natural-language technical queries
* Equipment comparison
* Intelligent experiment planning assistance

### Platform

* Expanded user roles
* Institutional accounts
* Improved dashboards
* Analytics
* Notification system

---

## Design Goals

LabSync is designed around several principles:

**Discoverability**
Make laboratory equipment easier to find.

**Availability**
Make equipment availability visible before users attempt to book.

**Efficiency**
Reduce unnecessary manual coordination.

**Intelligence**
Use recommendation and AI capabilities to improve equipment discovery.

**Scalability**
Build the application around modular frontend, server, and database components.

---

## Project Information

| Category   | Details                                      |
| ---------- | -------------------------------------------- |
| Project    | LabSync                                      |
| Type       | Personal Project                             |
| Domain     | Laboratory Technology / Equipment Management |
| Status     | Active Development                           |
| Frontend   | React + TypeScript                           |
| Framework  | TanStack Start                               |
| Database   | Supabase / PostgreSQL                        |
| Styling    | Tailwind CSS                                 |
| AI         | Recommendation Services                      |
| Repository | `RajG1205/labsync`                           |

---

## Author

**Raj Gupta**

B.Tech — Computer Science Engineering
AI & Machine Learning

GitHub: [@RajG1205](https://github.com/RajG1205)

---

## License

This project is licensed under the MIT License.

See [`LICENSE`](LICENSE) for details.
