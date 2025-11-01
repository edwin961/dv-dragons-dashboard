// =======================================================
// 🐉 DV Dragons Dashboard - Servidor Express Optimizado
// =======================================================

// 1️⃣ Cargar variables de entorno
require("dotenv").config();
const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Variables del entorno
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env;

// 2️⃣ Configuración Express
app.use(express.static("public")); // Archivos estáticos (CSS, imágenes)
app.use(express.urlencoded({ extended: true }));

// -------------------------------------------------------
// 🌐 Ruta principal
// -------------------------------------------------------
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

// -------------------------------------------------------
// 🔑 Ruta de callback OAuth2 (Discord)
// -------------------------------------------------------
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("⚠️ Faltó el código de autorización.");
  }

  try {
    // 1️⃣ Intercambiar el código por un token
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
      console.error("Error token:", tokenData);
      return res.status(500).send("Error al obtener token de Discord.");
    }

    const accessToken = tokenData.access_token;

    // 2️⃣ Obtener los servidores del usuario
    const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const guildsData = await guildsResponse.json();

    const MANAGE_GUILD_PERMISSION = 32;
    const adminGuilds = guildsData.filter(
      (g) => (parseInt(g.permissions) & MANAGE_GUILD_PERMISSION) === MANAGE_GUILD_PERMISSION
    );

    // 3️⃣ Construir lista de servidores
    const guildListHTML =
      adminGuilds.length > 0
        ? `<div class="servers-grid">
            ${adminGuilds
              .map((g) => {
                const icon = g.icon
                  ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
                  : "/icono.png";
                return `
                  <div class="server-card">
                    <img src="${icon}" alt="${g.name}" class="server-icon" />
                    <div class="server-info">
                      <h3>${g.name}</h3>
                      <p class="server-id">ID: ${g.id}</p>
                    </div>
                    <a href="/dashboard/${g.id}" class="config-btn">Configurar</a>
                  </div>`;
              })
              .join("")}
          </div>`
        : `<div class="empty-state"><p>No tienes servidores con permiso “Administrar Servidor”.</p></div>`;

    // 4️⃣ Enviar vista
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Tus Servidores</title>
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
              <h1>Tus Servidores</h1>
              <p class="subtitle">Selecciona un servidor para configurar</p>
              ${guildListHTML}
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

// -------------------------------------------------------
// ⚙️ Ruta de configuración individual
// -------------------------------------------------------
app.get("/dashboard/:guildId", (req, res) => {
  const guildId = req.params.guildId;

  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Configuración del Servidor</title>
        <link rel="stylesheet" href="/styles.css">
    </head>
    <body>
        <div class="navbar">
            <a href="/" class="logo">
                <img src="/icono.png" alt="Logo">
                <span>DV Dragons Bot</span>
            </a>
        </div>

        <div class="config-container">
            <a href="javascript:history.back()" class="back-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Volver a Servidores
            </a>

            <div class="config-header">
                <h1>Panel de Configuración</h1>
                <p class="server-id-badge">Servidor: ${guildId}</p>
            </div>

            <div class="config-section">
                <h2>Opciones Disponibles</h2>
                <div class="config-options">
                    <div class="option-card">
                        <div class="option-icon">⚙️</div>
                        <h3>Configuración General</h3>
                        <p>Ajusta las opciones básicas del bot</p>
                    </div>
                    <div class="option-card">
                        <div class="option-icon">👋</div>
                        <h3>Mensajes de Bienvenida</h3>
                        <p>Personaliza los saludos para nuevos miembros</p>
                    </div>
                    <div class="option-card">
                        <div class="option-icon">🔧</div>
                        <h3>Comandos</h3>
                        <p>Gestiona los comandos disponibles</p>
                    </div>
                    <div class="option-card">
                        <div class="option-icon">📊</div>
                        <h3>Estadísticas</h3>
                        <p>Revisa el uso y actividad del bot</p>
                    </div>
                </div>
            </div>
        </div>

        <footer class="footer">
            <p>© 2025 DV Dragons Bot. Todos los derechos reservados.</p>
        </footer>
    </body>
    </html>
  `);
});

// -------------------------------------------------------
// 🚀 Iniciar servidor
// -------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ Servidor en línea: http://localhost:${PORT}`);
});
