import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import './App.css';
import Markdown from 'react-markdown';

const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

const INITIAL_MESSAGE = `{"response": "How can I assist you today?", "answers": ["What is a stroke?", "I have a specific question about stoke", "I want to talk a bit"]} `;
// Remove any sensitive information before sending to OpenAI
const anonymizeMessage = async (message) => {
  // construct url for get request
  const getURL = "http://localhost:3001/api/redact/" + encodeURIComponent(message);

  // Fetch response from server
  const response = await axios.get(getURL);
  if (response) {
    return response.data.message;
  }
  return "";
};

const getInstructions = async () => {
  // construct url for get request
  const getURL = "http://localhost:3001/api/instructions";

  // Fetch response from server
  const response = await axios.get(getURL);
  if (response) {
    return response.data;
  }
  return "";
};

function App() {
  // State variables
  // Current input
  const [prompt, setPrompt] = useState("");
  // Input is enbaled or disabled
  const [promptEnabled, setPromptEnabled] = useState(true);
  // All previous chat messages
  const [chatMessages, setChatMessages] = useState([{
    type: "output-message",
    contents: "How can I assist you today?"
  }]);
  // OpenAI thread of current conversation
  const [thread, setThread] = useState();
  // Current answer options
  const [answerOptions, setAnswerOptions] = useState([
    "What is a stroke?",
    "I have a specific question about stoke",
    "I want to talk a bit",
  ]);
  const [assistant, setAssistant] = useState();

  // Initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      // Get instructions from server
      const INSTRUCTIONS = await getInstructions();

      // Create assistant
      const newAssistant = await openai.beta.assistants.create({
        name: "StrokeGPT",
        instructions: INSTRUCTIONS,
        model: "gpt-4o-mini",
        // response_format: { "type": "json_object" },
        tools: [{ type: "file_search" }],
        tool_resources: {
          "file_search": {
            "vector_store_ids": ["vs_3ma57mdNEcSijAQvQi68FULs"]
          }
        }
      });
      setAssistant(newAssistant);

      // Create thread
      const newThread = await openai.beta.threads.create({
        messages: [
          {
            role: "assistant",
            content: INITIAL_MESSAGE,
          }
        ]
      });
      setThread(newThread);
    };
    
    initializeChat();
  }, []);
  
  // Forces updated chat messages to allow streaming
  useEffect(() => {
  }, [chatMessages]);

  // Fixes any broken json, allowing it to work with streaming responses
  function fixJSON(json) {
    // Checker for valid JSON
    function isValidJSON(testJSON) {
      try {
        JSON.parse(testJSON);
        return true;
      }
      catch (error) {
        return false;
      }
    }
  
    // Trims anything before first "{"
    if (json.includes("{")) {
      json = json.slice(json.indexOf("{"));
    }
    else {
      return "{}";
    }
    // Ignore correct inputs
    if (json.trim().endsWith('}')) {
      return json;
    }
  
    // Try to fix via adding on
    const additions = [`": ""}`, `""}`, `"}`, `"": ""}`, `"]}`, `""]}`, `]}`, `}`];
  
    let validJSON = "";
    additions.forEach((addition) => {
      const testJSON = json + addition;
      if (isValidJSON(testJSON)) {
        validJSON = testJSON;
      }
    });
  
    return validJSON;
  }

  // Makes a call to OpenAI API
  const getChatResponse = async (message) => {
    try {
      const updateChatObjects = (message, responseText) => {
        // Convert to JSON
          // console.log(`INPUT: ${responseText}`);
          responseText = fixJSON(responseText);
          console.log(responseText);
          // console.log(`OUTPUT: ${responseText}`);
        const responseJSON = JSON.parse(responseText);
        // Separate response components
        const responseMessage = responseJSON["response"] || "";
        const answers = responseJSON["answers"] || [];
        const user_info = responseJSON["user_info"] || "";
        console.log(user_info);

        // Update chat messages (streaming)
        setChatMessages([
          createMessageObject(responseMessage, false),
          createMessageObject(message, true),
          ...chatMessages,
        ]);
        setAnswerOptions(answers);
      };

      const returnMessage = await openai.beta.threads.messages.create(
        thread.id,
        {
          role: "user",
          content: message
        }
      );

      let responseText = "";
      const addToResponseText = (text) => {
        responseText += text;
        updateChatObjects(message, responseText);
      };

      const run = openai.beta.threads.runs.stream(thread.id, {
        assistant_id: assistant.id
      })
      .on('textCreated', (text) => addToResponseText("\n"))
      .on('textDelta', (textDelta, snapshot) => addToResponseText(textDelta.value))
      .on('toolCallCreated', (toolCall) => addToResponseText(`\n${toolCall.type}\n\n`))
      .on('toolCallDelta', (toolCallDelta, snapshot) => {
        if (toolCallDelta.type === 'code_interpreter') {
          if (toolCallDelta.code_interpreter.input) { 
            addToResponseText(toolCallDelta.code_interpreter.input);
          }
          if (toolCallDelta.code_interpreter.outputs) {
            addToResponseText("\noutput >\n");
            toolCallDelta.code_interpreter.outputs.forEach(output => {
              if (output.type === "logs") {
                addToResponseText(`\n${output.logs}\n`);
              }
            });
          }
        }
      })
      .on('end', () => {
        setPromptEnabled(true);
      });

      setThread(thread);
    }
    catch (err) {
        console.error(err);
    }
  };

  
  const createMessageObject = (message, user) => {
    return {
      type: user ? "input-message" : "output-message",
      contents: message
    };
  };

  const handleSubmitForm = async (message) => {
    // Clean message of personal information
    const cleanMessage = await anonymizeMessage(message)

    // Clear message from input box
    setPrompt("");
    setAnswerOptions([]);
    setPromptEnabled(false); // temporarily disable prompt textbox

    // Add to chat history
    setChatMessages([
      createMessageObject(cleanMessage, true),
      ...chatMessages,
    ]);

    // Get response from OpenAI
    const response = await getChatResponse(cleanMessage);

  };
  
  const handleKeyDown = async (e) => {
    if (e.key === "Enter" && prompt !== "") {
      handleSubmitForm(prompt);
    }
  };
  
  const handlePromptChange = (x) => {
    setPrompt(x.target.value);
  };

  return (
    <div className="App">
      {/* Chat messages */}
      <div className="chat-container" >
        {/* <div className="chat-messages-container"> */}
        {/* </div> */}
        {/* Answer options */}
        <div className="answer-options-container">
          {answerOptions.map((option) => (
            <div
            className="chat-bubble answer-option"
            onClick={() => {
              handleSubmitForm(option);
              setAnswerOptions([]);
            }}
            >
              {option}
            </div>
          ))}
        </div>
          {chatMessages.map((message) => (
            <div className={"chat-bubble-container " + message.type + "-container"}>
              <div className={"chat-bubble " + message.type}>
                <Markdown>
                  {message.contents}
                </Markdown>
              </div>
            </div>
          ))}
        {/* Footer for auto scroll */}
        {/* <div className="footer"></div> */}
      </div>
      {/* Input */}
      <input
        id='prompt-input'
        disabled={!promptEnabled}
        autoFocus
        onKeyDown={handleKeyDown}
        placeholder='Enter prompt here...'
        onChange={(x) => handlePromptChange(x)}
        autoComplete='off'
        value={prompt}
      >
      </input>
    </div>
  );
}

export default App;
