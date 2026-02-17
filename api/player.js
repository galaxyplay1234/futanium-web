export default async function handler(req, res) {
  try {
    const target = "https://grandebibo.com/KIPO_ES25/zigo2";

    const response = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13)",
        "Referer": "https://grandebibo.com/",
        "Origin": "https://grandebibo.com"
      }
    });

    let html = await response.text();

    // 🔥 remove redirecionamento automático
    html = html.replace(/window\.location.*?;/g, "");
    html = html.replace(/location\.href.*?;/g, "");

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);

  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no player");
  }
}