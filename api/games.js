// pages/api/games.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

// Config do Firebase (a mesma do painel)
const firebaseConfig = {
  apiKey: "AIzaSyDKaETzDzJnlWlFY3I7l7LMArsegmgo_M8",
  authDomain: "futanium-web.firebaseapp.com",
  projectId: "futanium-web",
  storageBucket: "futanium-web.firebasestorage.app",
  messagingSenderId: "594412535848",
  appId: "1:594412535848:web:83477e68402960c94ff51d",
  measurementId: "G-L2RV01TXJC"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
  try {
    const snapshot = await getDocs(collection(db, "games"));
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
        end_time: null,        // calcular depois
        is_live: null,         // calcular depois
        is_finished: null,     // calcular depois
        buttons: g.channels || []
      });
    }

    res.status(200).json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar jogos" });
  }
}

// Helpers
async function getChampLogo(name) {
  const snap = await getDocs(collection(db, "championships"));
  const champ = snap.docs.find(d => d.data().name === name);
  return champ ? champ.data().logo : null;
}

async function getTeamLogo(name) {
  const snap = await getDocs(collection(db, "teams"));
  const team = snap.docs.find(d => d.data().name === name);
  return team ? team.data().logo : null;
}