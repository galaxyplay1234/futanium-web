import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDKaETzDzJnlWlFY3I7l7LMArsegmgo_M8",
  authDomain: "futanium-web.firebaseapp.com",
  projectId: "futanium-web",
  storageBucket: "futanium-web.firebasestorage.app",
  messagingSenderId: "594412535848",
  appId: "1:594412535848:web:83477e68402960c94ff51d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
  try {
    const snapshot = await getDocs(collection(db, "buttons"));
    const buttons = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      buttons.push({
        name: data.name,
        link: data.link
      });
    });

    res.status(200).json(buttons);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar botões" });
  }
}