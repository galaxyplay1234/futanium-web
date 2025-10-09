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
        start_minutes: matchMinutes, // guardamos pra ordenar com precisão
        buttons: (f.channels?.arrayValue?.values || []).map((c, i) => ({
          url: c.mapValue.fields.url.stringValue,
          name: isAviso
            ? c.mapValue.fields.name?.stringValue || `Canal ${i + 1}`
            : `Canal ${i + 1}`
        }))
      };
    });

    // 🕐 Ordena por status e horário:
    games.sort((a, b) => {
      // 1️⃣ Ao vivo primeiro (mais recente primeiro)
      if (a.is_live && !b.is_live) return -1;
      if (!a.is_live && b.is_live) return 1;
      if (a.is_live && b.is_live) return b.start_minutes - a.start_minutes;

      // 2️⃣ Jogos futuros (não live e não finished) → ordem crescente
      if (!a.is_finished && !b.is_finished) return a.start_minutes - b.start_minutes;

      // 3️⃣ Encerrados no final (ordem crescente)
      if (a.is_finished && !b.is_finished) return 1;
      if (!a.is_finished && b.is_finished) return -1;
      if (a.is_finished && b.is_finished) return a.start_minutes - b.start_minutes;

      return 0;
    });

    res.status(200).json(games);

  } catch (err) {
    console.error("Erro na API:", err);
    res.status(500).json({ error: "Erro ao buscar jogos" });
  }
}