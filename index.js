// =======================================================
// 🐉 DV Dragons Dashboard - Con sesión, avatar y bienvenida real + Supabase
// =======================================================

require("dotenv").config();
const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const cookieParser = require("cookie-parser");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, BOT_TOKEN, SUPABASE_URL, SUPABASE_KEY } = process.env;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(express.static("public"));
app.use(express.json());
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

// 🔑 Callback OAuth
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
    if (tokenData.error)
      return res.status(500).send(`Error al obtener token: ${tokenData.error_description}`);

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
    res.status(500).send("Error interno al autenticar.");
  }
});

// 🧭 Lista de servidores
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
                const isBotInGuild = botGuildIds.includes(g.id);
                const actionButton = isBotInGuild
                  ? `<a href="/dashboard/${g.id}" class="server-modern-btn">IR</a>`
                  : `<a href="https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${g.id}" class="server-modern-btn invite">+</a>`;
                return `
                  <div class="server-card-modern">
                    <img class="server-modern-icon" src="${icon}" alt="${g.name}" />
                    <div class="server-modern-info">
                      <h3>${g.name}</h3>
                      <p>${g.owner ? "Owner" : "Admin"}</p>
                    </div>
                    ${actionButton}
                  </div>
                `;
              })
              .join("")}
          </div>`
        : `<div class="empty-state"><p>No tienes servidores administrables.</p></div>`;

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
          <a href="/" class="logo"><img src="/icono.png"><span>DV Dragons Bot</span></a>
          <div class="user-info-enhanced">
            <div class="user-avatar-wrapper">
              <img src="${avatar}" alt="${username}" />
              <div class="user-status-dot"></div>
            </div>
            <div class="user-details">
              <span class="user-name">${username}</span>
              <span class="user-role">Administrador</span>
            </div>
          </div>
        </div>
        <div class="dashboard-container">
          <h1>Manejar servidores</h1>
          ${guildListHTML}
          <div class="refresh-container">
            <button class="refresh-btn" onclick="window.location.reload()">↻ Actualizar lista</button>
          </div>
        </div>
        <footer class="footer"><p>© 2025 DV Dragons Bot.</p></footer>
      </body>
      </html>
    `);
  } catch (err) {
    console.error("❌ Error al obtener servidores:", err);
    res.status(500).send("Error al actualizar la lista de servidores.");
  }
});

// ⚙️ Dashboard individual — carga y guarda en Supabase
app.get("/dashboard/:guildId", async (req, res) => {
  const { guildId } = req.params;

  try {
    const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });
    const guildData = await guildResponse.json();
    if (guildData.message === "Unknown Guild") return res.send("❌ El bot no está en este servidor.");

    const channelsResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/channels`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    );
    const channels = await channelsResponse.json();
    const textChannels = channels.filter((c) => c.type === 0);

    // 🔹 Consultar datos existentes en Supabase
    const { data: bienvenida } = await supabase
      .from("bienvenidas")
      .select("*")
      .eq("guild_id", guildId)
      .single();

    const current = bienvenida || {};
    const channelOptions = textChannels
      .map(
        (c) =>
          `<option value="${c.id}" ${
            c.id === current.canal_id ? "selected" : ""
          }> #${c.name}</option>`
      )
      .join("");

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>${guildData.name} - Bienvenida</title>
        <link rel="stylesheet" href="/styles.css">
      </head>
      <body>
        <div class="navbar"><a href="/servers" class="logo"><img src="/icono.png"><span>DV Dragons Bot</span></a></div>
        <div class="dashboard-container">
          <div class="welcome-header">
            <div class="welcome-icon">🐉</div>
            <h1>Configuración de Bienvenida</h1>
            <p class="welcome-subtitle">${guildData.name}</p>
          </div>
          
          <div class="form-card-enhanced">
            <div class="form-section">
              <label class="form-label">
                <span class="label-icon">📢</span>
                Canal de Bienvenida
              </label>
              <select id="channel" class="form-select">${channelOptions}</select>
            </div>

            <div class="form-section">
              <label class="form-label">
                <span class="label-icon">✨</span>
                Encabezado
              </label>
              <input id="header" type="text" class="form-input" value="${current.encabezado || ""}" placeholder="Ej: ¡Bienvenido a ${guildData.name}!">
            </div>

            <div class="form-section">
              <label class="form-label">
                <span class="label-icon">💬</span>
                Mensaje de Bienvenida
              </label>
              <textarea id="message" rows="5" class="form-textarea" placeholder="Escribe un mensaje cálido para los nuevos miembros...">${current.texto || ""}</textarea>
            </div>

            <div class="form-section">
              <label class="form-label">
                <span class="label-icon">🖼️</span>
                GIF o Imagen
              </label>
              <input id="gif" type="text" class="form-input" value="${current.gif || ""}" placeholder="https://ejemplo.com/imagen.gif">
              <span class="form-hint">URL de una imagen o GIF para acompañar el mensaje</span>
            </div>

            <button class="save-btn-enhanced" onclick="guardar()">
              <span class="btn-icon">💾</span>
              Guardar Configuración
            </button>
          </div>
        </div>

        <script>
          async function guardar() {
            const btn = document.querySelector('.save-btn-enhanced');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="btn-icon">⏳</span> Guardando...';
            btn.disabled = true;
            
            const body = {
              guild_id: "${guildId}",
              canal_id: document.getElementById('channel').value,
              encabezado: document.getElementById('header').value,
              texto: document.getElementById('message').value,
              gif: document.getElementById('gif').value
            };
            
            try {
              const res = await fetch('/api/save-welcome', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
              });
              const result = await res.json();
              
              btn.innerHTML = '<span class="btn-icon">✅</span> ¡Guardado!';
              setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
              }, 2000);
              
              alert(result.message || "✅ Configuración guardada.");
            } catch (error) {
              btn.innerHTML = '<span class="btn-icon">❌</span> Error';
              setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
              }, 2000);
              alert("Error al guardar la configuración");
            }
          }
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al cargar dashboard.");
  }
});

// 🧩 Guardar configuración en Supabase
app.post("/api/save-welcome", async (req, res) => {
  const { guild_id, canal_id, encabezado, texto, gif } = req.body;
  try {
    await supabase.from("bienvenidas").upsert({
      guild_id,
      canal_id,
      encabezado,
      texto,
      gif,
      updated_at: new Date(),
    });
    res.json({ message: "✅ Configuración guardada correctamente." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Error al guardar." });
  }
});

// 🚀 Servidor online
app.listen(PORT, () => console.log(`✅ Servidor activo en http://localhost:${PORT}`));