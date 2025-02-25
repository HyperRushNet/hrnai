export default async function handler(req, res) {
    try {
        // Voeg CORS-headers toe
        res.setHeader('Access-Control-Allow-Origin', '*');  // Sta verzoeken van alle domeinen toe
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST'); // Sta zowel GET- als POST-verzoeken toe
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');  // Sta de Content-Type header toe

        // OPTIONS-verzoek voor CORS-ondersteuning
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Alleen GET en POST toestaan
        if (req.method !== 'GET' && req.method !== 'POST') {
            return res.status(405).json({ error: "Method not allowed" });
        }

        // Haal de echte IP uit de headers
        const forwardedIp = req.headers["x-forwarded-for"]?.split(",")[0];
        const userIp = forwardedIp || "8.8.8.8"; // Fallback naar een bekend IP als het niet gevonden wordt

        // Haal de locatie-informatie op via ip-api.com
        const locationResponse = await fetch(`http://ip-api.com/json/${userIp}?fields=66846719`);
        const locationData = await locationResponse.json();

        // Controleer of locatie-informatie beschikbaar is
        if (!locationData || locationData.status !== "success") {
            return res.status(500).json({ error: "Kon geen locatie-informatie ophalen" });
        }

        // Haal de tijdzone uit de locatie-data
        const { timezone } = locationData;

        // Haal de huidige datum en tijd op in de juiste tijdzone
        const date = new Date();
        const options = { 
            timeZone: timezone, 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit'
        };
        const formattedDate = date.toLocaleString('nl-NL', options);

        // Stuur de JSON-response terug
        res.status(200).json({
            ip: userIp,
            timezone,
            datetime: formattedDate
        });

    } catch (error) {
        console.error("Error fetching IP data:", error);
        res.status(500).json({ error: "Kon de tijd niet ophalen" });
    }
}
