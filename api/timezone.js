export default async function handler(req, res) {
    try {
        const apiUrl = "https://ipapi.co/json";
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (!data || Object.keys(data).length === 0) {
            throw new Error("Empty response from IP API");
        }

        const result = {
            ip: data.ip || "Onbekend",
            city: data.city || "Onbekend",
            region: data.region || "Onbekend",
            country: data.country_name || "Onbekend",
            country_code: data.country_code || "Onbekend",
            timezone: data.timezone || "Onbekend",
            utc_offset: data.utc_offset || "Onbekend",
            currency: data.currency || "Onbekend",
            languages: data.languages || "Onbekend"
        };

        res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching IP data:", error);
        res.status(500).json({ error: "Kon de gegevens niet ophalen" });
    }
}
