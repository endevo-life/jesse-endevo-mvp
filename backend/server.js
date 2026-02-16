const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ENDevo Digital Continuity Backend is running' });
});

// Assessment endpoint placeholder
app.post('/api/assessment/submit', (req, res) => {
  // TODO: Implement assessment submission logic
  res.json({ message: 'Assessment endpoint - to be implemented' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
