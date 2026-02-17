import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  try {
    const snapshot = await db
      .collection("buttons")
      .orderBy("name") // 🔥 ordena pelo nome
      .get();

    const buttons = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        name: data.name,
        link: data.link
      };
    });

    res.status(200).json(buttons);
  } catch (error) {
    console.error("Erro API buttons:", error);
    res.status(500).json({ error: "Erro ao buscar botões" });
  }
}