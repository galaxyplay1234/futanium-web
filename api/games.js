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
    const games = data.documents.map(doc => {
      const f = doc.fields;

      return {
        championship: f.champ?.stringValue || "",
        championship_image_url: null, // pode buscar depois de outra coleção
        home_team: f.home?.stringValue || "",
        visiting_team: f.away?.stringValue || "",
        home_team_image_url: null, // pode buscar depois
        visiting_team_image_url: null, // pode buscar depois
        start_time: f.time?.stringValue || "",
        end_time: null,        // vamos calcular depois
        is_live: null,         // vamos calcular depois
        is_finished: null,     // vamos calcular depois
        buttons: (f.channels?.arrayValue?.values || []).map(c => ({
          url: c.mapValue.fields.url.stringValue,
          name: c.mapValue.fields.name.stringValue
        }))
      };
    });

    res.status(200).json(games);

  } catch (err) {
    console.error("Erro na API:", err);
    res.status(500).json({ error: "Erro ao buscar jogos" });
  }
}