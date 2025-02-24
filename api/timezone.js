export default async function handler(req, res) {
    try {
        const response = await fetch("http://edns.ip-api.com/json");
        const data = await response.json();

        res.status(200).json(data);
    } catch (error) {
        console.error("Error fetching IP data:", error);
        res.status(500).json({ error: "Kon de gegevens niet ophalen" });
    }
}
