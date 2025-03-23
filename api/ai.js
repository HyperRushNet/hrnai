export default async function handler(req, res) {
    try {
        // Voeg CORS-headers toe
        res.setHeader('Access-Control-Allow-Origin', '*');  // Allow requests from any domain
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST'); // Allow both GET and POST requests
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');  // Allow Content-Type header

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Zorg ervoor dat het een POST-verzoek is
        if (req.method === 'POST') {
            // Verkrijg de JSON-gegevens van de POST-body
            const { q } = req.body;

            if (!q) {
                return res.status(400).json({ message: 'Parameter q (systemInstruction) is vereist.' });
            }

            // Verkrijg de echte IP uit de headers
            const forwardedIp = req.headers["x-forwarded-for"]?.split(",")[0];
            const userIp = forwardedIp || "8.8.8.8"; // Fallback naar een bekend IP als het niet gevonden is

            // Haal locatie-informatie op via ip-api.com
            const locationResponse = await fetch(`http://ip-api.com/json/${userIp}?fields=66846719`);
            const locationData = await locationResponse.json();

            // Controleer of locatie-informatie beschikbaar is
            if (!locationData || locationData.status !== "success") {
                return res.status(500).json({ error: "Could not retrieve location information" });
            }

            // Extract de tijdzone uit locatiegegevens
            const { timezone } = locationData;

            // Haal de huidige datum en tijd op in de juiste tijdzone
            const date = new Date();
            const options = { 
                timeZone: timezone, 
                weekday: 'long', 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false 
            };
            
            const formattedDate = new Intl.DateTimeFormat('en-US', options).formatToParts(date);
            
            // Formatteer de uitvoer als een string
            const formattedOutput = `Time: ${formattedDate.find(part => part.type === 'hour')?.value}:${formattedDate.find(part => part.type === 'minute')?.value}, Date: ${formattedDate.find(part => part.type === 'day')?.value}/${formattedDate.find(part => part.type === 'month')?.value}/${formattedDate.find(part => part.type === 'year')?.value}, Day of the Week: ${formattedDate.find(part => part.type === 'weekday')?.value}`;

            // Haal de tijd op
            const dateText = formattedOutput;

            // Combineer de datum- en tijdinformatie met de system instruction
            const fullSystemInstruction = `Date info, only use when needed in 24h time: ${dateText}\n\n${q}`;

            // Maak het requestbody voor de externe API
            const requestBody = {
                messages: [
                    { role: "system", content: "Je bent een behulpzame AI-assistent." },
                    { role: "user", content: fullSystemInstruction }
                ]
            };

            // Verstuur de data naar de externe API
            const externalApiResponse = await fetch('https://text.pollinations.ai/openai?stream=true&model=mistral', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            // Verkrijg een stream van de body van de API-respons
            const reader = externalApiResponse.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let result = '';
            let previousResult = '';

            // Start streamen en verstuur de nieuwe data naar de client
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                result += decoder.decode(value, { stream: true });

                // Verwijder de 'data: ' prefix en [DONE] van de inhoud
                const cleanedResult = result
                    .split('\n')
                    .filter(line => {
                        // Verwijder de 'data: ' prefix en stop bij [DONE]
                        return line && !line.startsWith('data: [DONE]');
                    })
                    .map(line => line.replace(/^data: /, '')) // Verwijder 'data: ' van elke regel
                    .join('\n');

                // Zoek de inhoud van de 'content' tag en voeg deze samen zonder spaties
                const contentData = cleanedResult.split('\n')
                    .filter(line => {
                        // Zoek naar regels die een 'content' tag bevatten
                        try {
                            const parsedLine = JSON.parse(line);
                            return parsedLine?.choices?.some(choice => choice?.delta?.content);
                        } catch (e) {
                            return false;
                        }
                    })
                    .map(line => {
                        // Extract de content van de 'content' tag en voeg die samen
                        try {
                            const parsedLine = JSON.parse(line);
                            return parsedLine?.choices?.map(choice => choice?.delta?.content).join('');
                        } catch (e) {
                            return '';
                        }
                    })
                    .join('');

                // Vervang nieuwe lijnen door '\newline\' in plaats van een echte nieuwe lijn
                const formattedContent = contentData.replace(/\n/g, '\\newline\\');

                // Verzend alleen de nieuwe content naar de client
                const newContent = formattedContent.replace(previousResult, ''); // Verwijder de oude data
                if (newContent) {
                    res.write(newContent);  // Stuur alleen de nieuwe data naar de client
                    previousResult = formattedContent; // Sla de huidige data op als de vorige
                }

                // Zorg ervoor dat we stoppen met versturen als we de '[DONE]' string tegenkomen
                if (result.includes('data: [DONE]')) {
                    break;
                }
            }

            // Eindig de response
            res.end();

        } else {
            return res.status(405).json({ message: 'Method Not Allowed, only POST is supported.' });
        }

    } catch (error) {
        console.error("Error fetching IP data:", error);
        res.status(500).send("Could not retrieve the time or process the request.");
    }
}
