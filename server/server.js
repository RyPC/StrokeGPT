const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');


// Setting up server
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhose/mern-stack-db', {});

// Define routes and middleware
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


// // Create database
// const todoSchema = new mongoose.Schema({
//     task: String,
//     completed: Boolean,
// });

// const Todo = mongoose.model ("Todo", todoSchema);