export default async function handler(req, res) {
  // Wacht 20 seconden
  await new Promise(resolve => setTimeout(resolve, 20000));
  
  // Geef een antwoord terug na 20 seconden
  res.status(200).json({ message: "Wachten voltooid, 20 seconden gewacht!" });
}
