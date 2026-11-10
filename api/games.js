
import fetch from "node-fetch";

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const WORKER_URL =
  "https://futanium-painel-2-api.galaxyplay1234.workers.dev";

const CACHE_DURATION = 60 * 1000;

// Cache separado por tipo de acesso.
// Isso evita misturar IP Master e usuário comum.
let gamesCache = {
  master: null,
  normal: null
};

let gamesCacheTime = {
  master: 0,
  normal: 0
};

// =====================================================
// IPs MASTER
// =====================================================

const MASTER_IPS = [
  "177.54.84.91",
  "177.54.84.181",
  "177.54.93.93",
  "177.75.110.183",
  "177.23.116.38"
];

// =====================================================
// ANALYTICS FIREBASE RTDB
// =====================================================

async function updateAnalytics(userIP) {

  try {

    const nowSP = new Date(
      new Date().toLocaleString(
        "en-US",
        {
          timeZone: "America/Sao_Paulo"
        }
      )
    );

    const today =
      nowSP.toISOString().split("T")[0];

    const hour =
      nowSP.getHours().toString().padStart(2, "0") + ":00";

    const ipKey =
      userIP.replace(/\./g, "_");

    const baseURL =
      "https://futanium-web-default-rtdb.firebaseio.com";

    const analyticsURL =
      `${baseURL}/analytics/${today}.json`;

    const snapshot = await fetch(analyticsURL);

    if (!snapshot.ok) {
      throw new Error("Erro ao consultar Analytics");
    }

    const analyticsData =
      await snapshot.json() || {};

    const ips =
      analyticsData.ips || {};

    const hours =
      analyticsData.hours || {};

    ips[ipKey] = true;

    const updatedData = {

      ips,

      totalAccess:
        (analyticsData.totalAccess || 0) + 1,

      activeUsers:
        Object.keys(ips).length,

      hours: {

        ...hours,

        [hour]:
          (hours[hour] || 0) + 1

      }

    };

    await fetch(
      analyticsURL,
      {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(updatedData)
      }
    );

  } catch (err) {

    console.log("Erro analytics:", err);

  }

}

// =====================================================
// BUSCAR JOGOS NO CLOUDFLARE D1
// =====================================================

async function getGamesFromD1() {

  const response = await fetch(
    `${WORKER_URL}/api/games`
  );

  if (!response.ok) {

    throw new Error(
      `Worker respondeu ${response.status}`
    );

  }

  const games = await response.json();

  if (!Array.isArray(games)) {

    throw new Error(
      "Resposta inválida do Worker"
    );

  }

  return games;

}

// =====================================================
// PROCESSAR JOGOS
// =====================================================

function processGames(data, isMaster) {

  const nowSP = new Date(
    new Date().toLocaleString(
      "en-US",
      {
        timeZone: "America/Sao_Paulo"
      }
    )
  );

  const todaySP =
    nowSP.toISOString().split("T")[0];

  let games = data.map(game => {

    // =================================================
    // DATA
    // =================================================

    const gameDate =
      game.date || "";

    // =================================================
    // JOGO OCULTO
    // =================================================

    const hideGame =
      game.hideGame || false;

    if (hideGame) {
      return null;
    }

    // =================================================
    // NÃO MOSTRAR JOGOS FUTUROS
    // =================================================

    if (gameDate > todaySP) {
      return null;
    }

    // =================================================
    // TIMES
    // =================================================

    const home =
      game.home || "";

    const away =
      game.away || "";

    // =================================================
    // AVISO
    // =================================================

    const isAviso =
      home.toLowerCase() === "aviso" &&
      away.toLowerCase() === "aviso";

    // =================================================
    // HORÁRIO
    // =================================================

    const matchTimeStr =
      game.time || "";

    const cleanTime =
      matchTimeStr.replace("h", ":");

    const [h, m] =
      cleanTime.split(":").map(
        v => parseInt(v) || 0
      );

    const matchMinutes =
      h * 60 + m;

    // =================================================
    // LIVE / ENCERRADO
    // =================================================

    let isLive = false;
    let isFinished = false;

    if (gameDate) {

      const [
        year,
        month,
        day
      ] = gameDate.split("-").map(Number);

      const matchDateTime = new Date(
        year,
        month - 1,
        day,
        h,
        m,
        0
      );

      const nowDateTime = new Date(
        nowSP.getFullYear(),
        nowSP.getMonth(),
        nowSP.getDate(),
        nowSP.getHours(),
        nowSP.getMinutes(),
        0
      );

      const diffMinutes =
        (nowDateTime - matchDateTime) / 60000;

      if (
        diffMinutes >= 0 &&
        diffMinutes < 130
      ) {
        isLive = true;
      }

      if (diffMinutes >= 130) {
        isFinished = true;
      }

    }

    // =================================================
    // MINUTOS ATÉ O JOGO
    // =================================================

    let minutesToStart = 0;

    if (gameDate) {

      const [
        year,
        month,
        day
      ] = gameDate.split("-").map(Number);

      const matchDateTime = new Date(
        year,
        month - 1,
        day,
        h,
        m,
        0
      );

      const nowDateTime = new Date(
        nowSP.getFullYear(),
        nowSP.getMonth(),
        nowSP.getDate(),
        nowSP.getHours(),
        nowSP.getMinutes(),
        0
      );

      minutesToStart =
        (matchDateTime - nowDateTime) / 60000;

    }

    // =================================================
    // PODE MOSTRAR BOTÕES?
    // =================================================

    const canShowButtons =
      isMaster
        ? true
        : minutesToStart <= 15;

    // =================================================
    // CANAIS
    // =================================================

    const allButtons =
      (game.channels || []).map(
        (channel, i) => ({

          url:
            channel.url || "",

          name:
            isAviso
              ? (channel.name || `Canal ${i + 1}`)
              : `Canal ${i + 1}`,

          captureM3u8:
            channel.captureM3u8 || false

        })
      );

    // =================================================
    // OCULTAR CANAIS
    // =================================================

    const hideChannels =
      game.hideChannels || false;

    // =================================================
    // RESULTADO
    // =================================================

    return {

      championship:
        game.champ || "",

      championship_image_url:
        game.champ_logo || null,

      home_team:
        home,

      visiting_team:
        away,

      home_team_image_url:
        game.home_logo || null,

      visiting_team_image_url:
        game.away_logo || null,

      start_time:
        game.time || "",

      is_live:
        isLive,

      is_finished:
        isFinished,

      start_minutes:
        matchMinutes,

      game_date:
        gameDate,

      buttons:

        hideChannels
          ? []

          : (
              (
                canShowButtons ||
                isLive ||
                isFinished
              )
                ? allButtons
                : []
            )

    };

  });

  // =====================================================
  // REMOVE JOGOS OCULTOS
  // =====================================================

  games = games.filter(Boolean);

  // =====================================================
  // ORDENAÇÃO
  // =====================================================

  games.sort((a, b) => {

    if (a.game_date !== b.game_date) {

      return b.game_date.localeCompare(
        a.game_date
      );

    }

    if (a.is_live && !b.is_live) {
      return -1;
    }

    if (!a.is_live && b.is_live) {
      return 1;
    }

    if (a.is_live && b.is_live) {

      return (
        b.start_minutes -
        a.start_minutes
      );

    }

    if (!a.is_finished && !b.is_finished) {

      return (
        a.start_minutes -
        b.start_minutes
      );

    }

    if (a.is_finished && !b.is_finished) {
      return 1;
    }

    if (!a.is_finished && b.is_finished) {
      return -1;
    }

    if (a.is_finished && b.is_finished) {

      return (
        a.start_minutes -
        b.start_minutes
      );

    }

    return 0;

  });

  return games;

}

// =====================================================
// API PRINCIPAL
// =====================================================

export default async function handler(req, res) {

  try {

    // =================================================
    // IDENTIFICAR IP
    // =================================================

    const forwarded =
      req.headers["x-forwarded-for"];

    const userIP =
      forwarded
        ? forwarded.split(",")[0].trim()
        : req.socket.remoteAddress || "";

    const isMaster =
      MASTER_IPS.includes(userIP);

    const cacheKey =
      isMaster ? "master" : "normal";

    // =================================================
    // ANALYTICS
    // =================================================

    // Continua sendo atualizado em toda requisição.
    await updateAnalytics(userIP);

    // =================================================
    // VERIFICAR CACHE
    // =================================================

    const now = Date.now();

    const cacheValid =
      gamesCache[cacheKey] !== null &&
      (now - gamesCacheTime[cacheKey]) < CACHE_DURATION;

    // =================================================
    // CACHE HIT
    // =================================================

    if (cacheValid) {

      res.setHeader(
        "Cache-Control",
        "no-store"
      );

      res.setHeader(
        "X-Games-Cache",
        "HIT"
      );

      return res
        .status(200)
        .json(gamesCache[cacheKey]);

    }

    // =================================================
    // CACHE MISS - BUSCAR NO D1
    // =================================================

    const data =
      await getGamesFromD1();

    const games =
      processGames(data, isMaster);

    // =================================================
    // SALVAR CACHE
    // =================================================

    gamesCache[cacheKey] =
      games;

    gamesCacheTime[cacheKey] =
      now;

    // =================================================
    // RESPOSTA
    // =================================================

    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    res.setHeader(
      "X-Games-Cache",
      "MISS"
    );

    return res
      .status(200)
      .json(games);

  } catch (err) {

    console.error(
      "Erro na API:",
      err
    );

    return res
      .status(500)
      .json({
        error: "Erro ao buscar jogos"
      });

  }

}
