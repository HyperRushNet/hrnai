export default async function handler(req, res) {
    try {
        const response = await fetch('https://ipapi.co/json');
        const data = await response.json();

        const result = {
            ip: data.ip,
            city: data.city,
            region: data.region,
            country: data.country_name,
            country_code: data.country_code,
            timezone: data.timezone,
            utc_offset: data.utc_offset,
            currency: data.currency,
            languages: data.languages
        };

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Kon de gegevens niet ophalen' });
    }
}
