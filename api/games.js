import fetch from "node-fetch";

export default async function handler(req, res) {
  try {

    const MASTER_IPS = [
      "177.75.111.25",
      "181.77.207.80",
      "MAIS_UM_IP_SE_PRECISAR"
    ];

    const forwarded = req.headers["x-forwarded-for"];
    const userIP = forwarded
      ? forwarded.split(",")[0].trim()
      : req.socket.remoteAddress;

    const isMaster = MASTER_IPS.includes(userIP);

    // ===============================
    // 🔥 ANALYTICS VIA REST
    // ===============================
    try {

      const nowSP = new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
      );

      const today = nowSP.toISOString().split("T")[0];
      const hour = nowSP.getHours().toString().padStart(2, "0") + ":00";

      const ipKey = userIP.replace(/\./g, "_");

      const baseURL = "https://futanium-web-default-rtdb.firebaseio.com";
      const analyticsURL = `${baseURL}/analytics/${today}.json`;

      const snapshot = await fetch(analyticsURL);
      const analyticsData = await snapshot.json() || {};

      const ips = analyticsData.ips || {};
      const hours = analyticsData.hours || {};

      ips[ipKey] = true;

      const updatedData = {
        ips,
        totalAccess: (analyticsData.totalAccess || 0) + 1,
        activeUsers: Object.keys(ips).length,
        hours: {
          ...hours,
          [hour]: (hours[hour] || 0) + 1
        }
      };

      await fetch(analyticsURL, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData)
      });

    } catch (err) {
      console.log("Erro analytics:", err);
    }

    // ===============================
    // 🔥 BUSCA FIRESTORE
    // ===============================

    const url = "https://firestore.googleapis.com/v1/projects/futanium-web/databases/(default)/documents/games";
    const response = await fetch(url);
    const data = await response.json();

    if (!data.documents) {
      return res.status(200).json([]);
    }

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

      const isAviso =
        home.toLowerCase() === "aviso" &&
        away.toLowerCase() === "aviso";

      const matchTimeStr = f.time?.stringValue || "";
      const cleanTime = matchTimeStr.replace("h", ":");
      const [h, m] = cleanTime.split(":").map(v => parseInt(v) || 0);

      const matchMinutes = h * 60 + m;

// 🧠 Dia esportivo até 02:00
let adjustedNow = nowMinutes;
let adjustedMatch = matchMinutes;
let adjustedEnd = matchMinutes + 130;

// Se for antes das 02:00 → ainda pertence ao dia anterior
if (nowMinutes < 120) {
  adjustedNow += 1440;
}

// Se jogo começa antes das 02:00 → pertence ao dia anterior
if (adjustedMatch < 120) {
  adjustedMatch += 1440;
  adjustedEnd += 1440;
}

let isLive = false;
let isFinished = false;

// 🔴 Depois das 02:00 ignora status do dia anterior
if (nowMinutes >= 120) {

  isLive = false;
  isFinished = false;

} else {

  isLive =
    adjustedNow >= adjustedMatch &&
    adjustedNow < adjustedEnd;

  isFinished =
    adjustedNow >= adjustedEnd;
}

      const minutesToStart = matchMinutes - nowMinutes;

      const canShowButtons = isMaster
        ? true
        : (minutesToStart <= 15);

      const allButtons =
        (f.channels?.arrayValue?.values || []).map((c, i) => ({
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
        is_live: isLive,
        is_finished: isFinished,
        start_minutes: matchMinutes,
        buttons:
          (canShowButtons || isLive || isFinished)
            ? allButtons
            : []
      };
    });

    games.sort((a, b) => {
      if (a.is_live && !b.is_live) return -1;
      if (!a.is_live && b.is_live) return 1;
      if (a.is_live && b.is_live) return b.start_minutes - a.start_minutes;
      if (!a.is_finished && !b.is_finished)
        return a.start_minutes - b.start_minutes;
      if (a.is_finished && !b.is_finished) return 1;
      if (!a.is_finished && b.is_finished) return -1;
      if (a.is_finished && b.is_finished)
        return a.start_minutes - b.start_minutes;
      return 0;
    });

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(games);

  } catch (err) {
    console.error("Erro na API:", err);
    res.status(500).json({ error: "Erro ao buscar jogos" });
  }
}