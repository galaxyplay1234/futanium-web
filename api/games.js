export default async function handler(req, res) {
  try {
    // URL da coleção "games" no Firestore
    const url = "https://firestore.googleapis.com/v1/projects/futanium-web/databases/(default)/documents/games";

    // Pega os documentos direto do Firestore
    const response = await fetch(url);
    const data = await response.json();

    if (!data.documents) {
      return res.status(200).json([]);
    }

    // Transforma os documentos do Firestore no formato desejado
    let games = data.documents.map(doc => {
      const f = doc.fields;
      return {
        championship: f.champ?.stringValue || "",
        championship_image_url: f.champ_logo?.stringValue || null,
        home_team: f.home?.stringValue || "",
        visiting_team: f.away?.stringValue || "",
        home_team_image_url: f.home_logo?.stringValue || null,
        visiting_team_image_url: f.away_logo?.stringValue || null,
        start_time: f.time?.stringValue || "",
        end_time: null,
        is_live: null,
        is_finished: null,
        buttons: (f.channels?.arrayValue?.values || []).map((c, i) => ({
          url: c.mapValue.fields.url.stringValue,
          name: `Canal ${i + 1}`
        }))
      };
    });

    // ✅ Ordena do mais cedo pro mais tarde (08h30 → 21h40)
    games.sort((a, b) => {
      const timeA = parseInt(a.start_time.replace(":", "").replace("h", ""));
      const timeB = parseInt(b.start_time.replace(":", "").replace("h", ""));
      return timeA - timeB;
    });

    res.status(200).json(games);

  } catch (err) {
    console.error("Erro na API:", err);
    res.status(500).json({ error: "Erro ao buscar jogos" });
  }
}