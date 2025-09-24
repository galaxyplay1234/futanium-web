import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Corrige os \n da key
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  try {
    const snapshot = await db.collection("games").get();
    const games = [];

    for (const doc of snapshot.docs) {
      const g = doc.data();

      // Buscar logos
      const champSnap = await db.collection("championships")
        .where("name", "==", g.champ)
        .get();
      const champLogo = !champSnap.empty ? champSnap.docs[0].data().logo : null;

      const homeSnap = await db.collection("teams")
        .where("name", "==", g.home)
        .get();
      const homeLogo = !homeSnap.empty ? homeSnap.docs[0].data().logo : null;

      const awaySnap = await db.collection("teams")
        .where("name", "==", g.away)
        .get();
      const awayLogo = !awaySnap.empty ? awaySnap.docs[0].data().logo : null;

      games.push({
        championship: g.champ,
        championship_image_url: champLogo,
        home_team: g.home,
        visiting_team: g.away,
        home_team_image_url: homeLogo,
        visiting_team_image_url: awayLogo,
        start_time: g.time,
        end_time: null,        // vamos calcular depois
        is_live: null,         // vamos calcular depois
        is_finished: null,     // vamos calcular depois
        buttons: g.channels || [],
      });
    }

    res.status(200).json(games);
  } catch (err) {
    console.error("Erro na API:", err);
    res.status(500).json({ error: "Erro ao buscar jogos" });
  }
}