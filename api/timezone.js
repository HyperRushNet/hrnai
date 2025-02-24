export default async function handler(req, res) {
    try {
        // Haal de echte IP uit de headers
        const forwardedIp = req.headers["x-forwarded-for"]?.split(",")[0];
        const userIp = forwardedIp || "8.8.8.8"; // Fallback naar een bekend IP als het niet gevonden wordt

        // Haal de locatie en tijdzone-info op via ip-api.com
        const locationResponse = await fetch(`http://ip-api.com/json/${userIp}?fields=timezone`);
        const locationData = await locationResponse.json();

        // Controleer of locatie-informatie beschikbaar is
        if (!locationData || locationData.status !== "success") {
            return res.status(500).send("Kon geen tijdzone ophalen");
        }

        // Haal de tijdzone uit de locatie-data
        const { timezone } = locationData;

        // Haal de lokale tijd op in de juiste tijdzone
        const date = new Date();
        const options = { 
            timeZone: timezone, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            timeZoneName: 'short' 
        };
        const localTime = date.toLocaleTimeString('nl-NL', options);

        // Geef alleen de tijd terug
        res.status(200).send(localTime);
    } catch (error) {
        console.error("Error fetching IP data:", error);
        res.status(500).send("Kon de tijd niet ophalen");
    }
}
