const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compromise = require('compromise');
require("dotenv").config();
const OpenAI = require('openai');


// Setting up server
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Define routes and middleware
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});


function redactPersonalInfo(message) {
    const doc = compromise(message);

    // Full name
    // Social Security number (SSN)
    // Driver’s license
    // Mailing address
    // Credit card information
    // Passport information
    // Financial information
    // Medical records

    const personalInfo = ["Person" /* Name */, "PhoneNumber", "Address", "Email"];

    for (const category of personalInfo) {
        doc.match(`#${category}+`).replaceWith(`[REDACTED ${category}]`);
    }

    return doc.text();
}

async function getResponse() { 
    const assistant = await openai.beta.assistants.create({
      name: "Math Tutor",
      instructions: "You are a personal math tutor. Write and run code to answer math questions.",
      tools: [{ type: "code_interpreter" }],
      model: "gpt-4o"
    });
  }

app.get("/api/redact/:message", (req, res) => {
    res.send({message: redactPersonalInfo(req.params.message)});
});
  
/*

// Examples
const examples = [
"My name is John Doe and I'm a stroke survivor",
"Call me Jane Smith. I need help.",
"I'm Robert Johnson, seeking advice about heart disease",
"Alice Brown here, wondering about treatment options",
"yesterday, dave and i met with dr monica lee"
];

examples.forEach(example => {
console.log(`  Original: ${example}`);
console.log(`Anonymized: ${redactPersonalInfo(example)}`);
console.log('---');
});

*/





// Connect to MongoDB
// mongoose.connect('mongodb://localhose/mern-stack-db', {});

// // Create database
// const todoSchema = new mongoose.Schema({
//     task: String,
//     completed: Boolean,
// });

// const Todo = mongoose.model ("Todo", todoSchema);