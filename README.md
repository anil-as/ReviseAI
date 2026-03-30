# ReviseAI 🧠


**ReviseAI** is an advanced, AI-powered learning management system built with a "Proactive & Background-First" design philosophy. It empowers both instructors and students through automated question generation, intelligent spaced-repetition scheduling, and real-time interactive dashboards to supercharge the learning and assessment experience.

## ✨ Key Features

### 🎓 For Students
- **Intelligent Revision Scheduling:** Personalized, spaced-repetition algorithm to optimize learning and retention.
- **Assessments Hub:** Real-time revision status tracking, dynamic interactive quizzes, and instant AI-driven feedback.
- **Proactive Dashboard:** A high-end, responsive dark-themed UI (in the style of Aceternity UI) with interactive calendar widgets and task categorization.
- **Integrated Chat & Guidance:** Smart chat interface for instant academic assistance.

### 👨‍🏫 For Instructors
- **Automated Content Generation (RAG):** Upload PDF materials, and ReviseAI uses Google's Gemini API to automatically chunk documents and generate relevant assessment questions.
- **Comprehensive Analytics:** Deep insights into student progress, performance metrics, and subject tracking through dynamic charts.
- **Advanced Course Management:** Easily create subjects, enroll students, setup topics, and oversee assessments.
- **Automated Answer Evaluation:** AI seamlessly evaluates student answers based on course material, reducing manual grading time.

---

## 🛠️ Technology Stack

**Frontend**
- **Framework:** React.js (React Router for navigation)
- **State Management & Fetching:** Axios for API requests
- **Animations:** Framer Motion & GSAP for fluid, premium micro-animations
- **Data Visualization:** Recharts
- **Code/Text Editor:** Monaco Editor
- **UI/UX Pattern:** Custom Glassmorphism, Dark-mode responsive layouts

**Backend**
- **Framework:** FastAPI
- **Database:** SQLite (with SQLAlchemy ORM)
- **AI Integration:** Google Gemini API (for RAG, evaluation, and dynamic question generation)
- **NLP Processing:** NLTK for text processing and chunking
- **Authentication:** JWT (python-jose), Passlib (bcrypt)
- **Task Scheduling:** Custom Background Schedulers for revision routines

---

## 📂 Project Structure

```text
ReviseAI/
├── backend/                  # FastAPI Application
│   ├── main.py               # Entry point and API Routers
│   ├── database.py           # DB connection & Session management
│   ├── models.py             # SQLAlchemy schemas
│   ├── routers/              # API Endpoints (Auth, Dashboard, Assessments, etc.)
│   ├── services/             # Core logic (Question generation, RAG, Reminders)
│   ├── uploads/              # Storage for uploaded PDFs and documents
│   └── requirements.txt      # Python dependencies
│
└── frontend/                 # React UI Application
    ├── src/
    │   ├── components/       # Reusable React components (Sidebar, Cards, etc.)
    │   ├── pages/            # View pages (Dashboards, AssessmentHub, Chat)
    │   └── App.js            # Main application routing
    └── package.json          # Node.js dependencies
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+ recommended)
- **Python** (3.9+ recommended)
- **Google Gemini API Key** (for AI features to function)

### 1. Backend Setup

Open a terminal and navigate to the backend directory:
```bash
cd backend
```

Create a virtual environment and activate it:
```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
```

Install python dependencies:
```bash
pip install -r requirements.txt
```

Environment Variables (`backend/.env`):
Create a `.env` file in the `backend/` root directory and populate it:
```env
GEMINI_API_KEY=your_gemini_api_key_here
SECRET_KEY=your_jwt_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Start the FastAPI Server:
```bash
uvicorn main:app --reload --port 8000
```
*The API will be available at `http://localhost:8000` and Swagger docs at `http://localhost:8000/docs`.*

### 2. Frontend Setup

Open a new terminal window and navigate to the frontend directory:
```bash
cd frontend
```

Install Node modules:
```bash
npm install
```

Environment Variables (`frontend/.env`):
Create an `.env` file in the `frontend/` directory (if required) to point to your backend. E.g.:
```env
REACT_APP_API_URL=http://localhost:8000
```

Start the React Development Server:
```bash
npm start
```
*The frontend application will boot up at `http://localhost:3000`.*

---

## 🔒 License
This project is licensed under the MIT License - see the LICENSE file for details.
