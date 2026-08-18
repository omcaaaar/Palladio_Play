# Palladio Play

Palladio Play is an end-to-end web application designed to manage, track, and score Palladio Sports tournaments (starting with Badminton, but extensible to other team-based sports like Cricket, Table Tennis, Pickleball, etc.). 

It replaces the traditional pen-and-paper method with a seamless digital experience that includes a courtside scoring app, live score dashboards for viewers, and comprehensive tournament management tools for admins.

## 🎯 Features

- **Role-Based Access Control:** 
  - **Admin:** Register tournaments, manage teams, assign groups, schedule fixtures, and define events/points.
  - **Referee:** Start matches, update scores point-by-point in real-time, and manage match progress.
  - **Viewer:** Public dashboard to view live score updates, upcoming schedules, group standings, and historical scorecards.
- **Dynamic Tournament Formats:** Supports complex team vs. team match structures (e.g., Men's Singles, Men's Doubles, Mixed Doubles) and customizable round-robin and knockout stages.
- **Real-Time Score Overlays:** The backend architecture is designed to support automated OBS-compatible browser sources for live-streaming matches to YouTube or other platforms.
- **Responsive Design:** A beautiful, responsive interface optimized for mobile, tablet, and desktop viewing.

## 💻 Tech Stack

- **Frontend:** React (via Vite), React Router, Lucide React (Icons).
- **Backend:** Python, FastAPI, Uvicorn, WebSockets (for real-time updates).
- **Database:** Local JSON file-based storage per tournament (intended to be migrated to MongoDB).

## 🚀 Getting Started

Follow these instructions to get the application running in your local environment.

### Prerequisites

- Python 3.9+
- Node.js (v18+)

### 1. Backend Setup

Open a terminal and navigate to the `backend` directory:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt
```

Run the FastAPI server:

```bash
uvicorn main:app --reload
```
The backend API will be available at `http://localhost:8000`.

### 2. Frontend Setup

Open a new terminal and navigate to the `frontend` directory:

```bash
cd frontend
npm install
```

Run the Vite development server:

```bash
npm run dev
```
The web application will be accessible at `http://localhost:5173`.

### 3. Alternative Quick Start

You can also start both the backend and frontend simultaneously by running the provided shell script from the project root:

```bash
./run.sh
```

## 📂 Project Structure

```
Palladio_Sports_App/
├── backend/                # Python FastAPI backend
│   ├── main.py             # FastAPI application and routes
│   ├── models.py           # Pydantic data models
│   ├── database.py         # Database connection and logic
│   └── data/               # Local JSON database storage
├── frontend/               # React web application (Vite)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Dashboard, Login, Referee UI, etc.
│   │   └── App.jsx         # Main React application logic
│   └── package.json        # Frontend dependencies
└── idea.txt                # Initial project requirements and specifications
```

## ☁️ Deployment Strategy

Currently designed for a local environment, the application is structured to be containerized and easily deployed to cloud platforms such as Azure Web Apps and Azure Container Apps in the future.
