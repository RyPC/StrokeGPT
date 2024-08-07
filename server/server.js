const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compromise = require('compromise');
require("dotenv").config();
const OpenAI = require('openai');
const fs = require('fs');
const crypto = require('crypto-js');


// Setting up server
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const CRYPTO_SECRET_KEY = process.env.CRYPTO_SECRET_KEY;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});


// Define routes


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


// Uses Comprise API to remove any personal information
function encryptPersonalInfo(message) {
  const doc = compromise(message);

  // Full name
  // Social Security number (SSN)
  // Driver’s license
  // Mailing address
  // Credit card information
  // Passport information
  // Financial information
  // Medical records

  // Match the following info
  const personalInfo = ["Person", "PhoneNumber", "Place", "Email"];
  const regex = "(#" + personalInfo.join("+|#") + "+)";
  const matches = doc.match(regex).out('array');

  // Encrypt sensitive info
  matches.forEach((info) => {
    const encryption = crypto.AES.encrypt(info, CRYPTO_SECRET_KEY).toString();
    doc.match(info).replaceWith(`[[${encryption}]]`);
  });

  return doc.text();
}

async function decryptPersonalInfo(message) {
  const doc = compromise(message);

  // Match any [[...]]
  const regex = /\[\[([^\[\]]*)\]\]/g;
  const matches = [...message.matchAll(regex)].map(answer => answer[1]);
  console.log(matches);

  // Decrypt sensitive info
  matches.forEach((encryptedInfo) => {
    const decryption = crypto.AES.decrypt(encryptedInfo, CRYPTO_SECRET_KEY).toString(crypto.enc.Utf8);
    console.log(`[[${encryptedInfo}]]`);
    console.log("into")
    console.log(decryption + "\n");
    doc.match(`[[${encryptedInfo}]]`).replaceWith(decryption);
    message = (
      message.substring(0, message.indexOf("[[")) +   // text before info
      decryption +                                    // info to insert
      message.substring(message.indexOf("]]") + 2)        // text after info
    );
  });
  
  return message;
}

app.get("/api/redact/:message", (req, res) => {
  res.json({message: encryptPersonalInfo(req.params.message)});
});

app.get("/api/decode/:message", async (req, res) => {
  res.json({message: await decryptPersonalInfo(req.params.message)});
});

app.get("/api/instructions", (req, res) => {
  const instructions = fs.readFileSync('instructions.txt', 'utf8');
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
      instructions: fs.readFileSync('instructions.txt', 'utf8'),
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