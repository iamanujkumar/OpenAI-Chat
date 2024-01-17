// server.js
const express = require('express');
const { OpenAI } = require('openai');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017"; // Default to local MongoDB if env variable not set
const dbName = 'openai-chat';
const collectionName = 'chat_history';

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, ignoreUndefined: true });

app.post('/message', async (req, res) => {
    try {
        const userMessage = req.body.message;

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{
                role: 'user',
                content: userMessage,
            }],
        });

        const gptResponse = response.choices[0].message.content;

        await storeChatEntry(userMessage, gptResponse);

        res.status(200).json({ message: gptResponse });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

async function storeChatEntry(userMessage, gptResponse) {
    try {
        await client.connect();

        const database = client.db(dbName);
        const collection = database.collection(collectionName);

        const entry = {
            timestamp: new Date(),
            userMessage,
            gptResponse,
        };

        await collection.insertOne(entry);
    } finally {
        await client.close();
    }
}

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
