export default async function handler(req, res) {
    try {
        const response = await fetch('https://ipapi.co/json');
        const data = await response.json();

        const { country_name, timezone } = data;

        res.status(200).json({ country: country_name, timezone });
    } catch (error) {
        res.status(500).json({ error: 'Kon de tijdzone niet ophalen' });
    }
}
