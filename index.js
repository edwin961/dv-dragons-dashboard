// =======================================================
// 🐉 DV Dragons Dashboard - Servidor Express Optimizado
// =======================================================

require("dotenv").config();
const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// 🌐 Inicio (sin cambios)
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
        <div class="nav-links">
          <a href="#features">Características</a>
          <a href="#commands">Comandos</a>
          <a href="#support">Soporte</a>
        </div>
      </div>

      <div class="hero">
        <div class="hero-content">
          <h1>Administra tu Servidor</h1>
          <p>Gestiona DV Dragons Bot de manera simple y eficiente.</p>
          <a href="${discordAuthUrl}" class="discord-button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515...z"/>
            </svg>
            Iniciar sesión con Discord
          </a>
        </div>
      </div>

      <footer class="footer">
        <p>© 2025 DV Dragons Bot. Todos los derechos reservados.</p>
      </footer>
    </body>
    </html>
  `);
});

// 🔑 Callback (actualizado con diseño moderno)
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("⚠️ Faltó el código de autorización.");

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
    if (tokenData.error) return res.status(500).send("Error al obtener token.");

    const accessToken = tokenData.access_token;
    const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const guildsData = await guildsResponse.json();

    const MANAGE_GUILD_PERMISSION = 32;
    const adminGuilds = guildsData.filter(
      (g) => (parseInt(g.permissions) & MANAGE_GUILD_PERMISSION) === MANAGE_GUILD_PERMISSION
    );

    // 🔹 Grid moderno estilo imagen
    const guildListHTML =
      adminGuilds.length > 0
        ? `<div class="servers-modern-grid">
            ${adminGuilds
              .map((g) => {
                const icon = g.icon
                  ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
                  : "/icono.png";
                const role = g.owner ? "Owner" : "Admin";
                return `
                  <div class="server-card-modern">
                    <img class="server-modern-icon" src="${icon}" alt="${g.name}" />
                    <div class="server-modern-info">
                      <h3>${g.name}</h3>
                      <p>${role}</p>
                    </div>
                    <a href="/dashboard/${g.id}" class="server-modern-btn">+</a>
                  </div>
                `;
              })
              .join("")}
          </div>`
        : `<div class="empty-state"><p>No tienes servidores con permiso "Administrar Servidor".</p></div>`;

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Manage Servers - DV Dragons</title>
        <link rel="stylesheet" href="/styles.css">
      </head>
      <body>
        <div class="navbar">
          <a href="/" class="logo">
            <img src="/icono.png" alt="Logo">
            <span>DV Dragons Bot</span>
          </a>
        </div>

        <div class="dashboard-container">
          <h1>Manejar servers</h1>
          <p class="subtitle">Seleccione un servidor a continuación para administrarlo.</p>
          ${guildListHTML}
          <div class="refresh-container">
            <p>¿Falta un servidor?</p>
            <button class="refresh-btn" onclick="location.reload()">↻ Refrezcar</button>
          </div>
        </div>

        <footer class="footer">
          <p>© 2025 DV Dragons Bot. Todos los derechos reservados.</p>
        </footer>
      </body>
      </html>
    `);
  } catch (err) {
    console.error("Error en callback:", err);
    res.status(500).send("Ocurrió un error en el servidor.");
  }
});

// ⚙️ Dashboard (sin cambios)
app.get("/dashboard/:guildId", (req, res) => {
  const guildId = req.params.guildId;
  res.send(`<!DOCTYPE html>
  <html><body>
    <h1>Panel del servidor: ${guildId}</h1>
    <p>Aquí puedes configurar DV Dragons Bot.</p>
  </body></html>`);
});

app.listen(PORT, () =>
  console.log(`✅ Servidor en línea: http://localhost:${PORT}`)
);