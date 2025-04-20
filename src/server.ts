import express from 'express';
import cors from 'cors';
import config from './config';
import scheduleRoutes from './routes/scheduleRoutes';

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Log incoming requests in development
if (config.server.env === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/schedule', scheduleRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message || 'An unexpected error occurred',
  });
});

// Start the server
app.listen(config.server.port, () => {
  console.log(`Server running on port ${config.server.port} in ${config.server.env} mode`);
  console.log(`API URL: ${config.api.baseUrl}`);
});

export default app;