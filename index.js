// =======================================================
// 🐉 DV Dragons Dashboard - Con sesión, avatar y bienvenida real
// =======================================================

require("dotenv").config();
const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 3000;
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, BOT_TOKEN } = process.env;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 🌐 Página principal
app.get("/", (req, res) => {
  const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&response_type=code&scope=identify%20guilds`;

  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>DV Dragons Dashboard</title>
      <link rel="stylesheet" href="/styles.css" />
    </head>
    <body>
      <div class="navbar">
        <a href="/" class="logo">
          <img src="/icono.png" alt="Logo">
          <span>DV Dragons Bot</span>
        </a>
      </div>

      <div class="hero">
        <div class="hero-content">
          <h1>Administra tu Servidor</h1>
          <p>Gestiona DV Dragons Bot de manera simple y eficiente.</p>
          <a href="${discordAuthUrl}" class="discord-button">Iniciar sesión con Discord</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// 🔑 Callback mejorado con cookie persistente y datos de usuario
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("⚠️ Falta el código de autorización.");

  try {
    // Intercambiar el code por el access_token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      return res
        .status(500)
        .send(`Error al obtener token: ${tokenData.error_description || tokenData.error}`);
    }

    const accessToken = tokenData.access_token;

    // 🔹 Obtener datos del usuario
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData = await userResponse.json();

    // Guardar datos en cookies (1 hora)
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 1000,
    });
    res.cookie("user_name", userData.username, { maxAge: 60 * 60 * 1000 });
    res.cookie(
      "user_avatar",
      userData.avatar
        ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
        : "/icono.png",
      { maxAge: 60 * 60 * 1000 }
    );

    res.redirect("/servers");
  } catch (err) {
    console.error("❌ Error en /callback:", err);
    res.status(500).send("Ocurrió un error interno al procesar la autenticación.");
  }
});

// 🧭 Ruta /servers - obtiene siempre datos actualizados y detecta si el bot está
app.get("/servers", async (req, res) => {
  const accessToken = req.cookies.access_token;
  const username = req.cookies.user_name;
  const avatar = req.cookies.user_avatar;

  if (!accessToken) {
    return res.redirect("/");
  }

  try {
    // 1️⃣ Obtener servidores del usuario
    const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const guildsData = await guildsResponse.json();

    // 2️⃣ Obtener servidores donde está el bot
    const botGuildsResponse = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });
    const botGuilds = await botGuildsResponse.json();
    const botGuildIds = Array.isArray(botGuilds) ? botGuilds.map((g) => g.id) : [];

    // 3️⃣ Filtrar servidores administrables
    const MANAGE_GUILD_PERMISSION = 32;
    const adminGuilds = guildsData.filter(
      (g) => (parseInt(g.permissions) & MANAGE_GUILD_PERMISSION) === MANAGE_GUILD_PERMISSION
    );

    // 4️⃣ Generar la lista
    const guildListHTML =
      adminGuilds.length > 0
        ? `<div class="servers-modern-grid">
            ${adminGuilds
              .map((g) => {
                const icon = g.icon
                  ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
                  : "/icono.png";
                const role = g.owner ? "Owner" : "Admin";
                const isBotInGuild = botGuildIds.includes(g.id);
                const actionButton = isBotInGuild
                  ? `<a href="/dashboard/${g.id}" class="server-modern-btn">IR</a>`
                  : `<a href="https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${g.id}" class="server-modern-btn invite">+</a>`;
                return `
                  <div class="server-card-modern">
                    <img class="server-modern-icon" src="${icon}" alt="${g.name}" />
                    <div class="server-modern-info">
                      <h3>${g.name}</h3>
                      <p>${role}</p>
                    </div>
                    ${actionButton}
                  </div>
                `;
              })
              .join("")}
          </div>`
        : `<div class="empty-state"><p>No tienes servidores con permiso de administración.</p></div>`;

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Manage Servers - DV Dragons</title>
        <link rel="stylesheet" href="/styles.css">
        <style>
          .user-info {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #fff;
            font-weight: 500;
          }
          .user-info img {
            width: 35px;
            height: 35px;
            border-radius: 50%;
            border: 2px solid #5865f2;
          }
          .invite { background-color: #5865f2; color: #fff; }
        </style>
      </head>
      <body>
        <div class="navbar">
          <a href="/" class="logo">
            <img src="/icono.png" alt="Logo">
            <span>DV Dragons Bot</span>
          </a>
          <div class="user-info">
            <img src="${avatar}" alt="Avatar">
            <span>${username}</span>
          </div>
        </div>

        <div class="dashboard-container">
          <h1>Manejar servidores</h1>
          <p class="subtitle">Selecciona un servidor para administrarlo o invitar al bot.</p>
          ${guildListHTML}
          <div class="refresh-container">
            <p>¿Falta un servidor?</p>
            <button class="refresh-btn" onclick="window.location.reload()">↻ Actualizar lista</button>
          </div>
        </div>

        <footer class="footer">
          <p>© 2025 DV Dragons Bot. Todos los derechos reservados.</p>
        </footer>
      </body>
      </html>
    `);
  } catch (err) {
    console.error("❌ Error al obtener servidores:", err);
    res.status(500).send("Error al actualizar la lista de servidores.");
  }
});

// ⚙️ Dashboard real con datos del servidor
app.get("/dashboard/:guildId", async (req, res) => {
  const guildId = req.params.guildId;
  const accessToken = req.cookies.access_token;

  if (!accessToken) return res.redirect("/");

  try {
    // 🔹 Obtener datos del servidor (usando el bot)
    const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });
    const guildData = await guildResponse.json();

    if (guildData.message === "Unknown Guild") {
      return res.status(404).send("❌ El bot no está en este servidor.");
    }

    // 🔹 Obtener canales del servidor
    const channelsResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/channels`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    );
    const channelsData = await channelsResponse.json();

    const textChannels = channelsData.filter((c) => c.type === 0);
    const channelOptions = textChannels
      .map((c) => `<option value="${c.id}">#${c.name}</option>`)
      .join("");

    const guildIcon = guildData.icon
      ? `https://cdn.discordapp.com/icons/${guildId}/${guildData.icon}.png`
      : "/icono.png";

    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${guildData.name} - Configuración de Bienvenida</title>
      <link rel="stylesheet" href="/styles.css">
      <style>
        .form-card {
          background: var(--bg-card);
          padding: 25px;
          border-radius: 20px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          max-width: 600px;
          margin: 0 auto;
          color: var(--text-light);
        }
        label { display:block; margin-top:15px; font-weight:500; }
        select, textarea, input[type="color"] {
          width:100%;
          margin-top:8px;
          background:#24273a;
          color:#fff;
          border:1px solid #3a3f58;
          border-radius:8px;
          padding:8px;
        }
        .save-btn {
          background:#5865f2;
          color:white;
          border:none;
          border-radius:10px;
          padding:10px 15px;
          margin-top:20px;
          cursor:pointer;
          font-weight:600;
        }
        .server-header {
          display:flex;
          align-items:center;
          gap:10px;
          margin-bottom:20px;
        }
        .server-header img {
          width:50px;
          height:50px;
          border-radius:50%;
        }
      </style>
    </head>
    <body>
      <div class="navbar">
        <a href="/servers" class="logo">
          <img src="/icono.png" alt="Logo">
          <span>DV Dragons Bot</span>
        </a>
      </div>

      <div class="dashboard-container">
        <div class="server-header">
          <img src="${guildIcon}" alt="Icono">
          <h1>${guildData.name}</h1>
        </div>
        <p class="subtitle">Personaliza cómo DV Dragons da la bienvenida en tu servidor 🐉</p>

        <div class="form-card">
          <label>Seleccionar Canal:</label>
          <select id="channel-select">
            ${channelOptions}
          </select>

          <label><input type="checkbox" id="ignore-bots"> Ignorar Bots</label>

          <label>Mensaje Personalizado:</label>
          <textarea id="welcome-message" rows="4" placeholder="¡Bienvenido {user} a ${guildData.name}!"></textarea>

          <label>Estilo de Fuente:</label>
          <select id="font-style">
            <option>Normal</option>
            <option>Negrita</option>
            <option>Cursiva</option>
            <option>Decorativo</option>
          </select>

          <label>Color del Mensaje:</label>
          <input type="color" id="color-picker" value="#5865f2">

          <button class="save-btn" onclick="guardarConfig()">💾 Guardar Configuración</button>
        </div>
      </div>

      <footer class="footer">
        <p>© 2025 DV Dragons Bot. Todos los derechos reservados.</p>
      </footer>

      <script>
        async function guardarConfig() {
          const data = {
            guildId: "${guildId}",
            channel: document.getElementById('channel-select').value,
            ignoreBots: document.getElementById('ignore-bots').checked,
            message: document.getElementById('welcome-message').value,
            font: document.getElementById('font-style').value,
            color: document.getElementById('color-picker').value,
          };
          alert("⚙️ Configuración guardada (simulada):\\n" + JSON.stringify(data, null, 2));
        }
      </script>
    </body>
    </html>
    `);
  } catch (err) {
    console.error("❌ Error al obtener datos del servidor:", err);
    res.status(500).send("Error al cargar la configuración del servidor.");
  }
});

// 🚀 Servidor online
app.listen(PORT, () =>
  console.log(`✅ Servidor en línea en http://localhost:${PORT}`)
);
