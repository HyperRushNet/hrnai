// api/upload.js (for Vercel)

const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        const { systemInstruction, fileData } = req.body;

        if (!systemInstruction && !fileData) {
            return res.status(400).json({ error: "Please provide a question or upload an image." });
        }

        try {
            // Fetch date information
            const dateText = await fetchDateText();

            // Construct full system instruction
            const fullSystemInstruction = `Date info, only use when needed in 24h time: ${dateText}\n\n${systemInstruction}`;

            // Construct the request body for the external API
            const requestBody = {
                messages: [
                    { role: "system", content: "Je bent een behulpzame AI-assistent." },
                    { role: "user", content: fullSystemInstruction }
                ]
            };

            // If file data exists, include it in the request body
            if (fileData) {
                requestBody.messages.push({
                    role: "user",
                    content: [{ type: "image_url", image_url: { url: fileData } }],
                });
            }

            // Send the request to the processing API
            const response = await sendToProcessingAPI(requestBody);
            res.status(200).json({ content: response });

        } catch (error) {
            console.error('Error processing request:', error);
            res.status(500).json({ error: 'Server error' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};

async function fetchDateText() {
    try {
        const response = await fetch('https://hrnai.vercel.app/api/date');
        return await response.text();
    } catch (error) {
        console.error('Error fetching date text:', error);
        return '';
    }
}

async function sendToProcessingAPI(requestBody) {
    try {
        const response = await fetch('https://text.pollinations.ai/openai?stream=true&model=mistral', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let result = '';

        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            result += decoder.decode(value, { stream: true });

            if (result.includes('data: [DONE]')) {
                break;
            }
        }

        return result;
    } catch (error) {
        console.error('Error sending request to processing API:', error);
        throw new Error('Error in API communication');
    }
}
