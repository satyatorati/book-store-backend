const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bookRoutes = require('./routes/book.routes');
const chatRoutes = require('./routes/chat.routes');
require('dotenv').config();

const app = express();

// CORS configuration
app.use(cors({
    origin: [
        'http://localhost:5173', // Local development
        'https://your-frontend-url.vercel.app' // Deployed frontend URL
    ],
    credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/books', bookRoutes);
app.use('/api/chat', chatRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 