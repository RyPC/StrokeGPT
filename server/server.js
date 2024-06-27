const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nlp = require('compromise')


// Setting up server
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Define routes and middleware
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


function redactPersonalInfo(message) {
    const doc = nlp(message);

    // Identify and redact person names
    doc.people().replaceWith('[REDACTED NAME]');

    doc.match('#ProperNoun+').replaceWith('[REDACTED NAME]');



    return doc.text();
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