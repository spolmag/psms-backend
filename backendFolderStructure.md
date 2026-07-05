school-management-backend/
├── config/
│ └── db.js # MongoDB connection logic
├── middleware/
│ ├── authMiddleware.js # JWT verification
│ └── roleMiddleware.js # RBAC (Admin/Teacher check)
├── models/
│ ├── School.js # School schema
│ ├── User.js # User schema with extraData
│ ├── Course.js # Course schema
│ ├── Lesson.js # Lesson / Schedule schema
│ └── Resource.js # Music instruments / Room schema
├── controllers/
│ ├── authController.js # Login / Registration logic
│ ├── lessonController.js # Scheduling logic
│ └── resourceController.js # Instrument inventory logic
├── routes/
│ ├── authRoutes.js # /api/auth endpoints
│ ├── lessonRoutes.js # /api/lessons endpoints
│ └── resourceRoutes.js # /api/resources endpoints
├── .env # Database URL, JWT Secrets (Git ignored)
├── package.json
└── server.js # App entry point
