const axios = require('axios');
const cheerio = require('cheerio'); // HTML parser om HTML-inhoud te extraheren

module.exports = async (req, res) => {
    const { q: url } = req.query;  // Verkrijg de URL van de queryparameter 'q'
    
    // Controleer of de URL is opgegeven en geldig is
    if (!url || !isValidUrl(url)) {
        return res.status(400).json({ error: 'Ongeldige of ontbrekende URL opgegeven' });
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
            const text = $(element).text().trim();
            if (text) {  // Voeg alleen niet-lege tekst toe
                extractedText.push(text);
            }
        });

        // Stel CORS-headers in
        res.setHeader('Access-Control-Allow-Origin', '*'); // Sta alle domeinen toe
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');  // Sta bepaalde methodes toe
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Sta bepaalde headers toe
        
        // Controleer of er tekst is geëxtraheerd, en geef een foutmelding als dat niet het geval is
        if (extractedText.length === 0) {
            return res.status(404).json({ error: 'Geen tekst gevonden op de opgegeven URL' });
        }

        // Stuur de LLM-vriendelijke output terug (gestructureerde tekst)
        res.status(200).json({
            url: url,
            extractedText: extractedText
        });
    } catch (error) {
        console.error('Fout bij ophalen van data:', error.message);
        // Toon een generieke foutmelding zonder dat de applicatie crasht
        res.status(500).json({ error: 'Er is een fout opgetreden bij het ophalen van de data.' });
    }
};

// Functie om te controleren of een URL geldig is
function isValidUrl(url) {
    const regex = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i; // Basis regex voor URL-validatie
    return regex.test(url);
}
