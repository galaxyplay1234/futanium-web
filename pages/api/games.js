import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDKaETzDzJnlWlFY3I7l7LMArsegmgo_M8",
  authDomain: "futanium-web.firebaseapp.com",
  projectId: "futanium-web",
  storageBucket: "futanium-web.firebasestorage.app",
  messagingSenderId: "594412535848",
  appId: "1:594412535848:web:83477e68402960c94ff51d",
  measurementId: "G-L2RV01TXJC"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export default async function handler(req, res) {
  try {
    const snapshot = await getDocs(collection(db, "games"));
    const games = [];

    for (const docSnap of snapshot.docs) {
      const g = docSnap.data();
      games.push({
        championship: g.champ,
        championship_image_url: null, // vamos resolver depois
        home_team: g.home,
        visiting_team: g.away,
        home_team_image_url: null,
        visiting_team_image_url: null,
        start_time: g.time,
        end_time: null,
        is_live: null,
        is_finished: null,
        buttons: g.channels || []
      });
    }

    res.status(200).json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar jogos" });
  }
}