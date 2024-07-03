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


// const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_API_KEY = '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'
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

    const personalInfo = ["Person" /* Name */, "PhoneNumber", "Place", "Email"];

    for (const category of personalInfo) {
        doc.match(`#${category}+`).replaceWith(`[REDACTED ${category}]`);
    }

    return doc.text();
}

app.get("/api/chat/:message", async (req, res) => { 
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    try {
        const assistant = await openai.beta.assistants.create({
            name: "StrokeGPT",
            instructions:  `You are a personalized stroke informant. Please respond briefly and with certainty, asking questions when needed. Each response should be easily understood at an 8th grade reading level.`,
            model: "gpt-4o"
        });

        const thread = await openai.beta.threads.create();

        const message = await openai.beta.threads.messages.create(
            thread.id,
            {
                role: "user",
                content: req.params.message
            }
        );

        // let responseText = "";

        const run = openai.beta.threads.runs.stream(thread.id, {
            assistant_id: assistant.id
        })
            .on('textCreated', (text) => {
                res.write('\nassistant > ');

            })
            .on('textDelta', (textDelta, snapshot) => {
                res.write(textDelta.value);
                // responseText+= textDelta.value;
            })
            .on('toolCallCreated', (toolCall) => {
                res.write(`\nassistant > ${toolCall.type}\n\n`);
            })
            .on('toolCallDelta', (toolCallDelta, snapshot) => {
                if (toolCallDelta.type === 'code_interpreter') {
                    if (toolCallDelta.code_interpreter.input) {
                        res.write(toolCallDelta.code_interpreter.input);
                        // responseText+= toolCallDelta.code_interpreter.input
                    }
                    if (toolCallDelta.code_interpreter.outputs) {
                        res.write("\noutput >\n");
                        toolCallDelta.code_interpreter.outputs.forEach(output => {
                        if (output.type === "logs") {
                            res.write(`\n${output.logs}\n`);
                            // responseText+= output.logs;
                        }
                    });
                    }
                }
            })
            .on("end", () => {
            res.end();
            })
            .on("close", () => {
                run.abort();
            });
        
        // let run = await openai.beta.threads.runs.createAndPoll(
        //     thread.id,
        //     { 
        //         assistant_id: assistant.id,
        //         instructions: "Please address the user as Jane Doe. The user has a premium account."
        //     }
        // );
        // if (run.status === 'completed') {
        //     const messages = await openai.beta.threads.messages.list(
        //         run.thread_id
        //     );
        //     for (const message of messages.data.reverse()) {
        //         console.log(`${message.role} > ${message.content[0].text.value}`);
        //     }
        // }
        // else {
        //     console.log(run.status);
        // }
    }
    catch (err) {
        console.error(err);
        res.status(500).send("Server error: " + err.message);
      }
})

// getResponse();

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