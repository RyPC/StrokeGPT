const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compromise = require('compromise');
require("dotenv").config();
const OpenAI = require('openai');
const FileSystem = require('fs');


// Setting up server
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});


// Define routes


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


// Uses Comprise API to remove any personal information
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

  const personalInfo = ["Person" /* < Name */, "PhoneNumber", "Place", "Email"];

  for (const category of personalInfo) {
    doc.match(`#${category}+`).replaceWith(`[REDACTED ${category}]`);
  }

  return doc.text();
}

app.get("/api/redact/:message", (req, res) => {
  res.send({message: redactPersonalInfo(req.params.message)});
});

app.get("/api/instructions", (req, res) => {
  const instructions = FileSystem.readFileSync('instructions.txt', 'utf8');
  res.send(instructions);
});


app.get("/api/chat/:message", async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const initialMessage = `{"response": "How can I assist you today?", "answers": ["What is a stroke?", "I have a specific question about stoke", "I want to talk a bit"]} `;
    
    // Create assistant
    const assistant = await openai.beta.assistants.create({
      name: "StrokeGPT",
      instructions: FileSystem.readFileSync('instructions.txt', 'utf8'),
      model: "gpt-4o-mini",
      // response_format: { "type": "json_object" },
      tools: [{ type: "file_search" }],
      tool_resources: {
        "file_search": {
          "vector_store_ids": ["vs_3ma57mdNEcSijAQvQi68FULs"]
        }
      },  
    });
  
    // Create thread
    const thread = await openai.beta.threads.create({
      messages: [
        {
        role: "assistant",
        content: initialMessage
        }
      ]
    });
    const returnMessage = await openai.beta.threads.messages.create(
      thread.id,
      {
        role: "user",
        content: req.params.message
      }
    );

    const run = openai.beta.threads.runs.stream(thread.id, {
      assistant_id: assistant.id
    })
    .on('textCreated', (text) => res.write("\n"))
    .on('textDelta', (textDelta, snapshot) => res.write(textDelta.value))
    .on('toolCallCreated', (toolCall) => res.write(`\n${toolCall.type}\n\n`))
    .on('toolCallDelta', (toolCallDelta, snapshot) => {
      if (toolCallDelta.type === 'code_interpreter') {
        if (toolCallDelta.code_interpreter.input) { 
          res.write(toolCallDelta.code_interpreter.input);
        }
        if (toolCallDelta.code_interpreter.outputs) {
          res.write("\noutput >\n");
          toolCallDelta.code_interpreter.outputs.forEach(output => {
            if (output.type === "logs") {
              res.write(`\n${output.logs}\n`);
            }
          });
        }
      }
    })
    .on('end', () => {
      res.end();
    });
  }
  catch (err) {
    console.error(err);
    res.status(500).send("Server error: " + err.message);
  }
});





// Connect to MongoDB
// mongoose.connect('mongodb://localhose/mern-stack-db', {});

// // Create database
// const todoSchema = new mongoose.Schema({
//   task: String,
//   completed: Boolean,
// });

// const Todo = mongoose.model ("Todo", todoSchema);