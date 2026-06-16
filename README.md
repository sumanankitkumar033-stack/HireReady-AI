# AI Interview Prep & Resume Optimizer

A full-stack application designed to help job seekers prepare for interviews using AI. The platform analyzes resumes, generates personalized interview reports (including technical and behavioral questions), and optimizes resumes based on specific job descriptions.

## 🚀 Features

- **User Authentication:** Secure registration and login using JWT and HttpOnly cookies.
- **Resume Parsing:** Automated text extraction from PDF resumes.
- **AI Interview Reports:** Generates detailed preparation plans, technical questions, behavioral questions, and identifies skill gaps.
- **Resume Optimization:** AI-driven resume enhancement tailored to specific job descriptions.
- **PDF Generation:** Export optimized resumes directly as PDF files.
- **Dashboard:** Manage and view all previous interview preparation reports.

## 🛠️ Tech Stack

**Frontend:**
- React.js
- Vite
- Tailwind CSS (Recommended)
- ESLint (Strict configuration)

**Backend:**
- Node.js & Express
- MongoDB & Mongoose
- JWT (JSON Web Tokens) for Auth
- `pdf-parse` for resume processing
- AI Integration (Custom AI Service)

---

## 📦 Project Structure

```text
AI-Full Stack Project/
├── Backend/
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── models/         # Mongoose schemas
│   │   ├── services/       # AI logic and PDF generation
│   │   └── config/         # Database and auth config
│   └── server.js           # Entry point
└── Frontend/
    ├── src/                # React components and hooks
    ├── vite.config.js      # Vite configuration
    └── eslint.config.js    # Linting rules
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB instance (Local or Atlas)

### 1. Clone the repository
```bash
git clone <repository-url>
cd AI-Full-Stack-Project
```

### 2. Backend Setup
```bash
cd Backend
npm install
```
- Create a `.env` file in the `Backend` folder:
```env
PORT=3000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_super_secret_key
AI_API_KEY=your_ai_service_key
```
```bash
npm start
```

### 3. Frontend Setup
```bash
cd ../Frontend
npm install
npm run dev
```

---

## 📑 API Endpoints

### Authentication
- `POST /api/auth/register` - Create a new account.
- `POST /api/auth/login` - Authenticate user.
- `GET /api/auth/me` - Get current user profile (Private).
- `POST /api/auth/logout` - Clear session.

### Interview & Resume
- `POST /api/interview/generate-report` - Upload PDF and get AI analysis.
- `GET /api/interview/` - Get all user reports.
- `GET /api/interview/:interviewId` - Get specific report details.
- `GET /api/interview/generate-resume/:interviewReportId` - Download optimized PDF resume.

---

## 📄 License
This project is licensed under the MIT License.