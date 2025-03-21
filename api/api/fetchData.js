const axios = require('axios');

module.exports = async (req, res) => {
    const { q: url } = req.query;  // Verkrijg de URL van de queryparameter 'q'
    
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
        
        // Voeg CORS headers toe
        res.setHeader('Access-Control-Allow-Origin', '*');  // Hiermee staat je server toegang toe van alle domeinen
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');  // Specificeer de toegestane HTTP-methodes
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');  // Specificeer de toegestane headers

        // Stuur de inhoud van de opgehaalde pagina door naar de client
        res.status(200).send(response.data);
    } catch (error) {
        console.error('Fout bij ophalen van data:', error);
        
        // Voeg CORS headers toe voor foutafhandelingsresponse
        res.setHeader('Access-Control-Allow-Origin', '*');  // Hiermee staat je server toegang toe van alle domeinen
        res.status(500).json({ error: 'Er is een fout opgetreden bij het ophalen van de data.' });
    }
};
