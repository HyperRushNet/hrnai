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

        // Verkrijg de queryparameter 'q' (de systemInstruction)
        const { q } = req.query;

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

        // Haal de ruwe data op van de externe API
        const rawData = await externalApiResponse.text();

        // Verstuur de ruwe data terug naar de frontend
        return res.status(200).json({ rawData });

    } catch (error) {
        console.error("Error fetching IP data:", error);
        res.status(500).send("Could not retrieve the time or process the request.");
    }
}
