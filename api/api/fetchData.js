const axios = require('axios');
const cheerio = require('cheerio'); // Een HTML parser om HTML inhoud te extraheren

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

        // Gebruik Cheerio om de HTML te parseren en tekst te extraheren
        const $ = cheerio.load(response.data);

        // Extracteer alleen de tekst van paragrafen en maak een JSON-structuur
        let extractedText = [];
        $('p').each((index, element) => {
            extractedText.push($(element).text());
        });

        // Stel CORS-headers in
        res.setHeader('Access-Control-Allow-Origin', '*'); // Sta alle domeinen toe
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');  // Sta bepaalde methodes toe
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Sta bepaalde headers toe
        
        // Stuur de LLM-vriendelijke output terug (gestructureerde tekst)
        res.status(200).json({
            url: url,
            extractedText: extractedText
        });
    } catch (error) {
        console.error('Fout bij ophalen van data:', error);
        res.status(500).json({ error: 'Er is een fout opgetreden bij het ophalen van de data.' });
    }
};
