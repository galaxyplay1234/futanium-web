// pages/api/games.js
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      2PKlCwXknQARni6q1yeYDoVolKVfesFI1zOJ4
GBeDB22dnHShwFTykugb2IRcGQGKnLuuYyZrF+mRxn0PKL1Tg3QDxvEKN/ndCuiL
cNtwpdkNzQKBgFPSbMKXFMyxDpXVnotaXDu/bjl8ItcGoopugFys39n+A11EtSW5
dRgvB+AjfKJ5pNJuyB7QCJH2Utw3GrDiqLgI2qsw0TzZy67Z1UxPpUtg7DOu8xbg
ScmfN6BXo1PBGngf4y5unxVSG1tKeGq12V66uMHQH2IkhfezOrwKxWMNAoGARGfx
OiI4sIUAnFgDpy+Ac/nJ/0+DxBROGBLVNPzzbUCtxvBtH4Ers22/0pnGsDtx85Ji
IMFWpYrxHDq7ZFMoXtWRmfgg7QKJUScf8klf6AOcjml2sn88Q+1BPtU2CclcbjvL
VdDjDYQWtQ+/acncQepjzkROFoOX0WwjMK1SqWUCgYEAjLv3TTJYeSVKwg1Oj5bp
iTzmeSlk3h94H/AXzjZZcr9H2VVojmpXwTVfnSaztdXSMKzcwOJl6ZoHof+E7rfR
LgOQs0C7VzKDmo1ajCBhKgw/crNPyItNxKd4kAFJ51belWxUxhW1kWRayFESE6VZ
ryeQ+y+0VRsx4xNjAUrIgLo=
-----END PRIVATE KEY-----`,
    }),
  });
}

const db = admin.firestore();

async function getChampLogo(name) {
  const snap = await db.collection("championships").where("name", "==", name).get();
  return snap.empty ? null : snap.docs[0].data().logo;
}

async function getTeamLogo(name) {
  const snap = await db.collection("teams").where("name", "==", name).get();
  return snap.empty ? null : snap.docs[0].data().logo;
}

export default async function handler(req, res) {
  try {
    const snapshot = await db.collection("games").get();
    const games = [];

    for (const doc of snapshot.docs) {
      const g = doc.data();
      games.push({
        championship: g.champ,
        championship_image_url: await getChampLogo(g.champ),
        home_team: g.home,
        visiting_team: g.away,
        home_team_image_url: await getTeamLogo(g.home),
        visiting_team_image_url: await getTeamLogo(g.away),
        start_time: g.time,
        end_time: null,       // depois você calcula
        is_live: null,        // depois você calcula
        is_finished: null,    // depois você calcula
        buttons: g.channels || []
      });
    }

    res.status(200).json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar jogos" });
  }
}