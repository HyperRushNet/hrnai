export default function handler(req, res) {
    // CORS header toevoegen
    res.setHeader('Access-Control-Allow-Origin', '*'); // Toegestaan voor alle domeinen
    res.setHeader('Access-Control-Allow-Methods', 'GET'); // Alleen GET-methodes toestaan
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Toegestane headers

    // De tijd berekenen en terugsturen
    const date = new Date();
    const options = { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        timeZoneName: 'short' 
    };
    const timeString = date.toLocaleTimeString('nl-NL', options);
    res.status(200).json({ time: timeString });
}
