import fetch from "node-fetch";

// =====================================================
// 🔥 CACHE DOS JOGOS DO FIRESTORE
// =====================================================
// O cache dura 1 minuto.
//
// IMPORTANTE:
// - Cacheia os dados vindos do Firestore por 1 minuto.
// - is_live é recalculado a cada requisição.
// - is_finished é recalculado a cada requisição.
// - minutesToStart é recalculado a cada requisição.
// - canShowButtons é recalculado a cada requisição.
// - ordenação é recalculada a cada requisição.
//
// Em ambientes serverless, cada instância pode ter seu
// próprio cache. Isso é normal.
// =====================================================

let gamesCache = null;
let gamesCacheTime = 0;

const CACHE_DURATION = 60 * 1000; // 1 minuto


export default async function handler(req, res) {
  try {

    const MASTER_IPS = [
      "177.54.84.42",
      "177.54.84.181",
      "177.54.93.93",
      "177.75.110.183",
      "177.23.116.38"
    ];

    const forwarded = req.headers["x-forwarded-for"];

    const userIP = forwarded
      ? forwarded.split(",")[0].trim()
      : req.socket.remoteAddress;

    const isMaster = MASTER_IPS.includes(userIP);


    // ===============================
    // 🔥 ANALYTICS
    // ===============================

    try {

      const nowSP = new Date(
        new Date().toLocaleString("en-US", {
          timeZone: "America/Sao_Paulo"
        })
      );

      const today = nowSP.toISOString().split("T")[0];

      const hour =
        nowSP.getHours().toString().padStart(2, "0") + ":00";

      const ipKey = userIP.replace(/\./g, "_");

      const baseURL =
        "https://futanium-web-default-rtdb.firebaseio.com";

      const analyticsURL =
        `${baseURL}/analytics/${today}.json`;

      const snapshot = await fetch(analyticsURL);

      const analyticsData =
        await snapshot.json() || {};

      const ips = analyticsData.ips || {};
      const hours = analyticsData.hours || {};

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

      await fetch(analyticsURL, {

        method: "PATCH",

        headers: {
          "Content-Type": "application/json"
        },

        body:
          JSON.stringify(updatedData)

      });

    } catch (err) {

      console.log(
        "Erro analytics:",
        err
      );

    }


    // ===============================
    // 🔥 BUSCA FIRESTORE COM CACHE
    // ===============================

    const now = Date.now();

    const cacheValid =
      gamesCache !== null &&
      (now - gamesCacheTime) < CACHE_DURATION;


    let data;


    if (cacheValid) {

      // =========================================
      // 🟢 CACHE VÁLIDO
      // Não consulta o Firestore novamente.
      // =========================================

      data = gamesCache;

    } else {

      // =========================================
      // 🔥 CACHE EXPIRADO
      // Consulta o Firestore novamente.
      // =========================================

      const url =
        "https://firestore.googleapis.com/v1/projects/futanium-web/databases/(default)/documents/games";

      const response =
        await fetch(url);

      data =
        await response.json();


      // =========================================
      // 💾 SALVA NO CACHE
      // =========================================

      gamesCache = data;

      gamesCacheTime = now;

    }


    // ===============================
    // 🔥 SEM JOGOS
    // ===============================

    if (!data.documents) {

      return res
        .status(200)
        .json([]);

    }


    // ===============================
    // 🔥 HORA ATUAL
    // ===============================

    // Isso NÃO fica em cache.
    // É calculado novamente em toda requisição.

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


    // ===============================
    // 🔥 PROCESSA OS JOGOS
    // ===============================

    // A partir daqui tudo é recalculado
    // em TODA requisição da API.

    let games = data.documents.map(doc => {

      const f = doc.fields;


      // ===============================
      // DATA DO JOGO
      // ===============================

      const gameDate =
        f.date?.stringValue || "";


      // ===============================
      // JOGO OCULTO
      // ===============================

      const hideGame =
        f.hideGame?.booleanValue || false;


      if (hideGame) {
        return null;
      }


      // ===============================
      // NÃO MOSTRAR JOGOS FUTUROS
      // ===============================

      if (gameDate > todaySP) {
        return null;
      }


      // ===============================
      // TIMES
      // ===============================

      const home =
        f.home?.stringValue || "";

      const away =
        f.away?.stringValue || "";


      // ===============================
      // AVISO
      // ===============================

      const isAviso =
        home.toLowerCase() === "aviso" &&
        away.toLowerCase() === "aviso";


      // ===============================
      // HORÁRIO
      // ===============================

      const matchTimeStr =
        f.time?.stringValue || "";


      const cleanTime =
        matchTimeStr.replace("h", ":");


      const [h, m] =
        cleanTime
          .split(":")
          .map(v => parseInt(v) || 0);


      const matchMinutes =
        h * 60 + m;


      // ===============================
      // 🔴 LIVE
      // RECALCULADO SEMPRE
      // ===============================

      let isLive = false;

      let isFinished = false;


      if (gameDate) {

        const [
          year,
          month,
          day
        ] =
          gameDate
            .split("-")
            .map(Number);


        const matchDateTime =
          new Date(
            year,
            month - 1,
            day,
            h,
            m,
            0
          );


        const nowDateTime =
          new Date(
            nowSP.getFullYear(),
            nowSP.getMonth(),
            nowSP.getDate(),
            nowSP.getHours(),
            nowSP.getMinutes(),
            0
          );


        const diffMinutes =
          (nowDateTime -
            matchDateTime) / 60000;


        // 🔴 LIVE
        if (
          diffMinutes >= 0 &&
          diffMinutes < 130
        ) {

          isLive = true;

        }


        // ⏹️ ENCERRADO
        if (diffMinutes >= 130) {

          isFinished = true;

        }

      }


      // ===============================
      // 🔥 TEMPO ATÉ O JOGO
      // RECALCULADO SEMPRE
      // ===============================

      const minutesToStart =
        gameDate

          ? (
              (
                new Date(
                  nowSP.getFullYear(),
                  nowSP.getMonth(),
                  nowSP.getDate(),
                  nowSP.getHours(),
                  nowSP.getMinutes(),
                  0
                )

                -

                new Date(
                  ...gameDate
                    .split("-")
                    .map(Number)
                    .map(
                      (v, i) =>
                        i === 1
                          ? v - 1
                          : v
                    ),
                  h,
                  m,
                  0
                )

              ) / -60000
            )

          : 0;


      // ===============================
      // 🔘 BOTÕES
      // RECALCULADO SEMPRE
      // ===============================

      const canShowButtons =
        isMaster
          ? true
          : (minutesToStart <= 15);


      // ===============================
      // 🔘 CANAIS / BOTÕES
      // ===============================

      const allButtons =
        (
          f.channels?.arrayValue?.values || []
        ).map((c, i) => ({

          url:
            c.mapValue.fields.url?.stringValue || "",

          name:
            isAviso

              ? (
                  c.mapValue.fields.name
                    ?.stringValue ||
                  `Canal ${i + 1}`
                )

              : `Canal ${i + 1}`,

          captureM3u8:
            c.mapValue.fields
              .captureM3u8
              ?.booleanValue || false

        }));


      // ===============================
      // 🙈 OCULTAR CANAIS
      // ===============================

      const hideChannels =
        f.hideChannels?.booleanValue || false;


      // ===============================
      // 🔥 RETORNO
      // ===============================

      return {

        championship:
          f.champ?.stringValue || "",

        championship_image_url:
          f.champ_logo?.stringValue || null,

        home_team:
          home,

        visiting_team:
          away,

        home_team_image_url:
          f.home_logo?.stringValue || null,

        visiting_team_image_url:
          f.away_logo?.stringValue || null,

        start_time:
          f.time?.stringValue || "",

        // 🔴 RECALCULADO
        is_live:
          isLive,

        // ⏹️ RECALCULADO
        is_finished:
          isFinished,

        start_minutes:
          matchMinutes,

        game_date:
          gameDate,

        // 🔘 RECALCULADO
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


    // ===============================
    // 🔥 REMOVE JOGOS NULL
    // ===============================

    games =
      games.filter(Boolean);


    // ===============================
    // 🔥 ORDENAÇÃO
    // ===============================

    games.sort((a, b) => {

      if (
        a.game_date !==
        b.game_date
      ) {

        return b.game_date
          .localeCompare(
            a.game_date
          );

      }


      // 🔴 LIVE PRIMEIRO

      if (
        a.is_live &&
        !b.is_live
      ) {
        return -1;
      }


      if (
        !a.is_live &&
        b.is_live
      ) {
        return 1;
      }


      if (
        a.is_live &&
        b.is_live
      ) {

        return (
          b.start_minutes -
          a.start_minutes
        );

      }


      // 🕐 PRÓXIMOS JOGOS

      if (
        !a.is_finished &&
        !b.is_finished
      ) {

        return (
          a.start_minutes -
          b.start_minutes
        );

      }


      // ⏹️ ENCERRADO

      if (
        a.is_finished &&
        !b.is_finished
      ) {

        return 1;

      }


      if (
        !a.is_finished &&
        b.is_finished
      ) {

        return -1;

      }


      if (
        a.is_finished &&
        b.is_finished
      ) {

        return (
          a.start_minutes -
          b.start_minutes
        );

      }


      return 0;

    });


    // ===============================
    // 🔥 NÃO CACHEAR NO NAVEGADOR
    // ===============================

    // O navegador sempre chama a API.
    // O cache de 1 minuto fica somente
    // na consulta aos dados do Firestore.

    res.setHeader(
      "Cache-Control",
      "no-store"
    );


    // ===============================
    // 🔥 RESPOSTA
    // ===============================

    res
      .status(200)
      .json(games);


  } catch (err) {

    console.error(
      "Erro na API:",
      err
    );

    res
      .status(500)
      .json({
        error:
          "Erro ao buscar jogos"
      });

  }
}