export default async function handler(req, res) {
    try {
        // Haal locatiegegevens op via ipapi.co
        const response = await fetch('https://ipapi.co/json');

        if (!response.ok) {
            throw new Error(`ipapi.co API error: ${response.status}`);
        }

        const data = await response.json();

        // Controleer of de tijdzone aanwezig is
        const timeZone = data.timezone || 'Europe/Amsterdam'; // Default naar CET als er iets misgaat

        // Haal de huidige tijd in de juiste tijdzone op
        const date = new Date();
        const options = { 
            timeZone: timeZone, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            timeZoneName: 'short' 
        };
        const timeString = date.toLocaleTimeString('nl-NL', options);

        // Zet headers voor no-CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Stuur alleen de tijd als pure tekst terug
        res.status(200).send(timeString);

    } catch (error) {
        console.error('Server error:', error); // Log de fout in de serverconsole
        res.status(500).send('Error fetching time');
    }
}
