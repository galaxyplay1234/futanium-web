import admin from "firebase-admin";

// Inicializa Firebase Admin apenas uma vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  try {
    const snapshot = await db.collection("games").get();
    const games = [];

    for (const docSnap of snapshot.docs) {
      const g = docSnap.data();

      games.push({
        championship: g.champ,
        championship_image_url: await getChampLogo(g.champ),
        home_team: g.home,
        visiting_team: g.away,
        home_team_image_url: await getTeamLogo(g.home),
        visiting_team_image_url: await getTeamLogo(g.away),
        start_time: g.time,
        end_time: null,        // vamos calcular depois
        is_live: null,         // vamos calcular depois
        is_finished: null,     // vamos calcular depois
        buttons: g.channels || []
      });
    }

    res.status(200).json(games);
  } catch (err) {
    console.error("Erro API:", err);
    res.status(500).json({ error: "Erro ao buscar jogos" });
  }
}

// Helpers para buscar logos
async function getChampLogo(name) {
  const snap = await db.collection("championships").get();
  const champ = snap.docs.find(d => d.data().name === name);
  return champ ? champ.data().logo : null;
}

async function getTeamLogo(name) {
  const snap = await db.collection("teams").get();
  const team = snap.docs.find(d => d.data().name === name);
  return team ? team.data().logo : null;
}