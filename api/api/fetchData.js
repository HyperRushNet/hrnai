const axios = require('axios');

module.exports = async (req, res) => {
    const { url } = req.query;  // Verkrijg de URL van de query parameter
    
    if (!url) {
        return res.status(400).json({ error: 'Geen URL opgegeven' });
    }

    try {
        // Haal de gegevens op van de opgegeven URL
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
            },
        });
        
        // Stuur de inhoud van de opgehaalde pagina door naar de client
        res.status(200).send(response.data);
    } catch (error) {
        console.error('Fout bij ophalen van data:', error);
        res.status(500).json({ error: 'Er is een fout opgetreden bij het ophalen van de data.' });
    }
};
