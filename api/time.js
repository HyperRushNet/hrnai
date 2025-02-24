export default function handler(req, res) {
    const date = new Date();

    // Converteer naar CET (UTC+1) en houd rekening met zomertijd
    const options = { 
        timeZone: 'Europe/Amsterdam', // CET en CEST afhankelijk van de tijd van het jaar
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        timeZoneName: 'short' 
    };

    const timeString = date.toLocaleTimeString('nl-NL', options);

    // Voeg CORS headers toe
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET'); 
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); 

    res.status(200).json({ time: timeString });
}
