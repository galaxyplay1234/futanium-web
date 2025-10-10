export default async function handler(req, res) {
  try {
    const url = "https://firestore.googleapis.com/v1/projects/futanium-web/databases/(default)/documents/games";
    const response = await fetch(url);
    const data = await response.json();

    if (!data.documents) return res.status(200).json([]);

    // ✅ Hora local (São Paulo) calculada corretamente em 24h
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const [hourStr, minuteStr] = formatter.format(now).split(":");
    const nowMinutes = parseInt(hourStr) * 60 + parseInt(minuteStr);

    let games = data.documents.map(doc => {
      const f = doc.fields;
      const home = f.home?.stringValue || "";
      const away = f.away?.stringValue || "";

      const isAviso = home.toLowerCase() === "aviso" && away.toLowerCase() === "aviso";

      // Converte hora tipo "13h00" ou "13:00" → minutos
      const matchTimeStr = f.time?.stringValue || "";
      const cleanTime = matchTimeStr.replace("h", ":");
      const [h, m] = cleanTime.split(":").map(v => parseInt(v) || 0);
      const matchMinutes = h * 60 + m;
      const endMinutes = matchMinutes + 130; // +2h10

      const isLive = nowMinutes >= matchMinutes && nowMinutes < endMinutes;
      const isFinished = nowMinutes >= endMinutes;
      const minutesToStart = matchMinutes - nowMinutes;

      // 🔓 Libera 15 minutos antes do início
      const canShowButtons = minutesToStart <= 15;

      const allButtons = (f.channels?.arrayValue?.values || []).map((c, i) => ({
        url: c.mapValue.fields.url.stringValue,
        name: isAviso
          ? c.mapValue.fields.name?.stringValue || `Canal ${i + 1}`
          : `Canal ${i + 1}`
      }));

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
        start_minutes: matchMinutes,
        buttons: (canShowButtons || isLive || isFinished) ? allButtons : []
      };
    });

    // 🕐 Ordenação de prioridade
    games.sort((a, b) => {
      if (a.is_live && !b.is_live) return -1;
      if (!a.is_live && b.is_live) return 1;
      if (a.is_live && b.is_live) return b.start_minutes - a.start_minutes;

      if (!a.is_finished && !b.is_finished) return a.start_minutes - b.start_minutes;

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