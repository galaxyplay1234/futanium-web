// pages/api/games.js
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "futanium-web",
      clientEmail: "firebase-adminsdk-fbsvc@futanium-web.iam.gserviceaccount.com",
      privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCnQDQby61fbXaD
8P2HRSx3zJ9Dk0iWP72IQYuLz69/hQ5MU/qQjA056nsT6+E+s3TTTteoEbIReTLe
kaTpJBwq+/iHPt+J4Jm21Awg/P+b07HCSfcbSS92RbU6+Y9RjkzWuD+FOWuXuGK7
XKxs7jCnKO7YsWb+qozDWQAQwywe3EVh2nCNqCP0ApiDoMW8tUCt29qK6xN4LOBv
Ppr3hz7VoXN+RXHMsrq8DWB+3Qn4es1wIOTip8BF4AyanJVo8LohYum+fmsGLnFt
PJ/5K2Y7HT3MdZMONTNFdLdly3CX1Jw84Y0iyh6QqAPM8Ko6/AuYOuxo46TSP/fn
9xxvCOujAgMBAAECggEAGGsDEJR7J/BYehPq7TRitSIz6w7rl+VkxlS3db6TzfIp
mmg1BU8v4Sbu4tjbJlHXT8B2M4H94EI0dJKJTpvTMaK0RV6fDpyyzyKvRfkErTCf
hmZRGZ6PkNzFhFTfdpXoJFMlvE1xUWcooa0lOV7Jzfs9FSL1ZAnstNqKFr2/88iS
a8uF+lhT41Jx0N39lnjCUs68uViHyVNtNW2rtkuQ6XWn2+p91wdibhDbXDMpj4Py
zZFf9omdh0NzpUnSL7/eVIUNiRhBhWXCNVTG/dHOIkVBN4Nc4WW7r1zkWmNbwqI+
HkcQesURbstIPs2K7bLArkFUaOcfM7h2o8LDbrfEHQKBgQDqvgrzSXB5iIkfRD47
po5ofOdlkFX5JXOCFDPXzQdnhwbiRJfzYfsSy4OiOM4SqlaNVKHJb9BqDgLfOcTi
XpOIvFwFdshs0B0mMcwKSw+Lf+AFMqKe6x0ChuqTfyHW34joMztWgVyyzcvbZTp+
e3ukPiEWCo76jR4KpWJV9IHvLwKBgQC2ZYaD/7zevY0XLkaLqWG+OAjX/UhJ/eCH
U5N4P1R150OE3w6HXI2n1p9L9I52PKlCwXknQARni6q1yeYDoVolKVfesFI1zOJ4
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