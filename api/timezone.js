export default async function handler(req, res) {
    try {
        // Haal de echte IP op via ip-api.com
        const ipResponse = await fetch("http://edns.ip-api.com/json");
        const ipData = await ipResponse.json();
        const userIp = ipData.dns.geoip || ipData.dns.ip; // Fallback naar het IP als geoIP ontbreekt

        if (!userIp) {
            throw new Error("Kon de echte IP niet ophalen");
        }

        // Gebruik het IP om de echte locatie op te halen via ipapi.co
        const locationResponse = await fetch(`https://ipapi.co/${userIp}/json`);
        const locationData = await locationResponse.json();

        res.status(200).json(locationData);
    } catch (error) {
        console.error("Error fetching IP data:", error);
        res.status(500).json({ error: "Kon de gegevens niet ophalen" });
    }
}
