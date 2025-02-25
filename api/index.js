export default async function handler(req, res) {
    try {
        // Voeg CORS-headers toe
        res.setHeader('Access-Control-Allow-Origin', '*');  // Allow requests from any domain
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST'); // Allow both GET and POST requests
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');  // Allow Content-Type header

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Retrieve the actual IP from the headers
        const forwardedIp = req.headers["x-forwarded-for"]?.split(",")[0];
        const userIp = forwardedIp || "8.8.8.8"; // Fallback to a known IP if not found

        // Fetch location information via ip-api.com
        const locationResponse = await fetch(`http://ip-api.com/json/${userIp}?fields=66846719`);
        const locationData = await locationResponse.json();

        // Check if location information is available
        if (!locationData || locationData.status !== "success") {
            return res.status(500).send("Could not retrieve location information");
        }

        // Extract the timezone from location data
        const { timezone } = locationData;

        // Get the current date and time in the correct timezone
        const date = new Date();
        const options = { 
            timeZone: timezone, 
            weekday: 'long', // Include the day of the week
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false // Use 24-hour format
        };
        const formattedDate = date.toLocaleString('en-US', options);

        // Send the formatted date and time as plain text
        res.status(200).send(formattedDate);
    } catch (error) {
        console.error("Error fetching IP data:", error);
        res.status(500).send("Could not retrieve the time");
    }
}
