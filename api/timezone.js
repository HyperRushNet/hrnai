export default async function handler(req, res) {
    try {
        // Haal de echte IP uit de headers
        const forwardedIp = req.headers["x-forwarded-for"]?.split(",")[0];
        const userIp = forwardedIp || "8.8.8.8"; // Fallback naar een bekend IP als het niet gevonden wordt

        // Haal de locatie en tijdzone-info op via ip-api.com
        const locationResponse = await fetch(`http://ip-api.com/json/${userIp}?fields=66846719`);
        const locationData = await locationResponse.json();

        res.status(200).json(locationData);
    } catch (error) {
        console.error("Error fetching IP data:", error);
        res.status(500).json({ error: "Kon de gegevens niet ophalen" });
    }
}
