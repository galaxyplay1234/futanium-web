<?php
// ===============================================
// 🔔 Envio de Notificação Firebase - Versão Responsiva + Sucesso
// ===============================================

$jsonFile = __DIR__ . '/chave-firebase.json';
$projectId = 'futanium-box-3-1'; // 🔹 ajuste conforme o seu projeto

$statusMsg = '';
$statusColor = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = $_POST['titulo'] ?? 'Notificação';
    $body = $_POST['mensagem'] ?? '';
    $topic = $_POST['topico'] ?? 'global';

    $serviceAccount = json_decode(file_get_contents($jsonFile), true);
    $header = base64_encode(json_encode(['alg'=>'RS256','typ'=>'JWT']));
    $now = time();
    $payload = base64_encode(json_encode([
        'iss' => $serviceAccount['client_email'],
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        'aud' => 'https://oauth2.googleapis.com/token',
        'exp' => $now + 3600,
        'iat' => $now
    ]));

    $input = $header . '.' . $payload;

    $key = openssl_pkey_get_private($serviceAccount['private_key']);
    $signature = '';
    if (!@openssl_sign($input, $signature, $key, 'sha256')) {
        $statusMsg = "❌ Erro: o servidor não permite openssl_sign()";
        $statusColor = "#dc3545";
    } else {
        $jwt = $input . '.' . rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');

        // Obter token de acesso
        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt
            ])
        ]);
        $resp = curl_exec($ch);
        curl_close($ch);
        $token = json_decode($resp, true)['access_token'] ?? null;

        if (!$token) {
            $statusMsg = "❌ Erro ao gerar token: $resp";
            $statusColor = "#dc3545";
        } else {
            // Enviar notificação
            $payload = [
                'message' => [
                    'topic' => $topic,
                    'notification' => [
                        'title' => $title,
                        'body' => $body
                    ]
                ]
            ];

            $ch = curl_init("https://fcm.googleapis.com/v1/projects/$projectId/messages:send");
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    "Authorization: Bearer $token",
                    "Content-Type: application/json"
                ],
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($payload)
            ]);
            $result = curl_exec($ch);
            $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($http == 200) {
                $statusMsg = "✅ Notificação enviada com sucesso!";
                $statusColor = "#28a745";
            } else {
                $statusMsg = "⚠️ Falha ao enviar ($http):<br>$result";
                $statusColor = "#dc3545";
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Enviar Notificação</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body {
  font-family: 'Poppins', Arial, sans-serif;
  background: linear-gradient(135deg, #f7f7f7, #ebebeb);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  height: 100vh;
  margin: 0;
  overflow: hidden; /* 🔒 bloqueia scroll */
  padding-top: 8vh;
}
form {
  background: #fff;
  padding: 25px 30px;
  border-radius: 16px;
  box-shadow: 0 6px 16px rgba(0,0,0,0.2);
  max-width: 380px;
  width: 90%;
  box-sizing: border-box;
}
h2 {
  text-align: center;
  margin-bottom: 20px;
  color: #222;
}
input, textarea {
  width: 100%;
  padding: 12px;
  margin-top: 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 15px;
  font-family: 'Poppins', Arial;
  box-sizing: border-box;
}
textarea {
  resize: vertical;
  min-height: 80px;
}
button {
  margin-top: 18px;
  width: 100%;
  padding: 12px;
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  transition: background 0.3s;
}
button:hover {
  background: #0056b3;
  cursor: pointer;
}
.status {
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 8px;
  text-align: center;
  font-weight: 500;
  color: #fff;
}
@media (max-width: 480px) {
  form { padding: 20px; }
  h2 { font-size: 20px; }
}
</style>
</head>
<body>

<form method="POST">
  <h2>📢 Enviar Notificação</h2>

  <?php if ($statusMsg): ?>
  <div class="status" style="background: <?= htmlspecialchars($statusColor) ?>;">
    <?= $statusMsg ?>
  </div>
  <?php endif; ?>

  <label>Título:</label>
  <input type="text" name="titulo" placeholder="Ex: Novo jogo ao vivo!" required>

  <label>Mensagem:</label>
  <textarea name="mensagem" placeholder="Ex: Flamengo x Vasco começou agora!" required></textarea>

  <label>Tópico:</label>
  <input type="text" name="topico" value="global">

  <button type="submit">Enviar Notificação</button>
</form>

</body>
</html>