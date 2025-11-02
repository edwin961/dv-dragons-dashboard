// =======================================================
// 🐉 DV Dragons Dashboard - Configuración de bienvenida
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

// 🔑 Callback
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("⚠️ Falta el código de autorización.");

  try {
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
    const accessToken = tokenData.access_token;

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData = await userResponse.json();

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
    res.status(500).send("Error interno de autenticación.");
  }
});

// 🧭 Servidores
app.get("/servers", async (req, res) => {
  const accessToken = req.cookies.access_token;
  const username = req.cookies.user_name;
  const avatar = req.cookies.user_avatar;

  if (!accessToken) return res.redirect("/");

  try {
    const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const guildsData = await guildsResponse.json();

    const botGuildsResponse = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });
    const botGuilds = await botGuildsResponse.json();
    const botGuildIds = Array.isArray(botGuilds) ? botGuilds.map((g) => g.id) : [];

    const MANAGE_GUILD_PERMISSION = 32;
    const adminGuilds = guildsData.filter(
      (g) => (parseInt(g.permissions) & MANAGE_GUILD_PERMISSION) === MANAGE_GUILD_PERMISSION
    );

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
          .user-info { display:flex;align-items:center;gap:10px;color:#fff;font-weight:500; }
          .user-info img { width:35px;height:35px;border-radius:50%;border:2px solid #5865f2; }
          .invite { background-color:#5865f2;color:#fff; }
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
          <p class="subtitle">Selecciona un servidor para configurarlo.</p>
          ${guildListHTML}
          <div class="refresh-container">
            <p>¿Falta un servidor?</p>
            <button class="refresh-btn" onclick="window.location.reload()">↻ Actualizar lista</button>
          </div>
        </div>

        <footer class="footer"><p>© 2025 DV Dragons Bot. Todos los derechos reservados.</p></footer>
      </body>
      </html>
    `);
  } catch (err) {
    console.error("❌ Error al obtener servidores:", err);
    res.status(500).send("Error al actualizar la lista de servidores.");
  }
});

// ⚙️ Dashboard de bienvenida
app.get("/dashboard/:guildId", (req, res) => {
  const guildId = req.params.guildId;

  res.send(`
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configuración de Bienvenida - DV Dragons</title>
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <div class="navbar">
      <a href="/servers" class="logo">
        <img src="/icono.png" alt="Logo">
        <span>DV Dragons Bot</span>
      </a>
    </div>

    <div class="dashboard-container">
      <h1>🐉 Configuración de Bienvenida</h1>
      <p class="subtitle">Personaliza cómo DV Dragons da la bienvenida en tu servidor.</p>

      <div class="form-card">
        <label>Seleccionar Canal:</label>
        <select id="channel-select">
          <option>#general</option>
          <option>#bienvenidas</option>
          <option>#chat</option>
        </select>

        <label><input type="checkbox" id="ignore-bots"> Ignorar Bots</label>

        <label>Mensaje Personalizado:</label>
        <textarea id="welcome-message" rows="4" placeholder="¡Bienvenido {user} al servidor {server}!"></textarea>

        <label>Estilo de Fuente:</label>
        <select id="font-style">
          <option>Normal</option>
          <option>Negrita</option>
          <option>Cursiva</option>
          <option>Decorativo</option>
        </select>

        <label>Color del Mensaje:</label>
        <input type="color" id="color-picker" value="#5865f2">

        <button class="save-btn">💾 Guardar Configuración</button>
      </div>
    </div>

    <footer class="footer"><p>© 2025 DV Dragons Bot. Todos los derechos reservados.</p></footer>
  </body>
  </html>
  `);
});

// 🚀 Servidor
app.listen(PORT, () =>
  console.log(`✅ Servidor en línea en http://localhost:${PORT}`)
);
