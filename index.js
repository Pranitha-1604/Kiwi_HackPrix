require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Import routes
const messageRoutes = require('./routes/messages');
const todoRoutes = require('./routes/todos');
const blockRoutes = require('./routes/blocks');
const memoryRoutes = require('./routes/memory');
const llmRoutes = require('./routes/llm');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api', messageRoutes);
app.use('/api', todoRoutes);
app.use('/api', blockRoutes);
app.use('/api', memoryRoutes);
app.use('/api', llmRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to KIWI API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: true,
    message: err.message || 'Internal Server Error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`KIWI backend server running on port ${PORT}`);
});