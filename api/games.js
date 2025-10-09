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

    // Hora atual em minutos (Brasil)
    const now = new Date();
    const brasilOffset = -3 * 60; // UTC-3
    const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + brasilOffset;

    let games = data.documents.map(doc => {
      const f = doc.fields;
      const home = f.home?.stringValue || "";
      const away = f.away?.stringValue || "";

      const isAviso = home.toLowerCase() === "aviso" && away.toLowerCase() === "aviso";

      // Converte hora tipo "13h00" ou "13:00" para minutos
      const matchTimeStr = f.time?.stringValue || "";
      const cleanTime = matchTimeStr.replace("h", ":");
      const [h, m] = cleanTime.split(":").map(v => parseInt(v) || 0);
      const matchMinutes = h * 60 + m;
      const endMinutes = matchMinutes + 120; // +2 horas

      // Define status automático
      const isLive = nowMinutes >= matchMinutes && nowMinutes < endMinutes;
      const isFinished = nowMinutes >= endMinutes;

      return {
        championship: f.champ?.stringValue || "",
        championship_image_url: f.champ_logo?.stringValue || null,
        home_team: home,
        visiting_team: away,
        home_team_image_url: f.home_logo?.stringValue || null,
        visiting_team_image_url: f.away_logo?.stringValue || null,
        start_time: f.time?.stringValue || "",
        end_time: null,
        is_live: isLive,
        is_finished: isFinished,
        buttons: (f.channels?.arrayValue?.values || []).map((c, i) => ({
          url: c.mapValue.fields.url.stringValue,
          name: isAviso
            ? c.mapValue.fields.name?.stringValue || `Canal ${i + 1}`
            : `Canal ${i + 1}`
        }))
      };
    });

    // Ordena por horário (mais cedo → mais tarde)
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