const express = require('express');
const cors = require('cors');
const path = require('path');

const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

/*
 CORS configuration
 allow Angular frontend origin from env and local defaults
*/
const localDevOrigins = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:65469',
  'http://127.0.0.1:65469',
];

const envOrigins = [
  process.env.FRONTEND_BASE_URL,
  ...(process.env.ADDITIONAL_FRONTEND_ORIGINS
    ? process.env.ADDITIONAL_FRONTEND_ORIGINS.split(',').map((origin) => origin.trim())
    : []),
];

const allowedOrigins = [...new Set([...envOrigins, ...localDevOrigins])].filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// enable CORS
app.use(cors(corsOptions));

// handle preflight requests
app.options('*', cors(corsOptions));

// body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Feedback System API is running',
  });
});

// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use(notFound);

// global error handler
app.use(errorHandler);

module.exports = app;
