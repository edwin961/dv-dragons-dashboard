// =======================================================
// 🐉 DV Dragons Dashboard - Con sidebar y navegación completa
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

// ⚙️ Dashboard principal con sidebar - Vista Overview (Server)
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

    const rolesResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/roles`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    );
    const roles = await rolesResponse.json();

    const icon = guildData.icon
      ? `https://cdn.discordapp.com/icons/${guildId}/${guildData.icon}.png`
      : "/icono.png";

    // Contar categorías (type 4)
    const categories = channels.filter(c => c.type === 4).length;
    const textChannels = channels.filter(c => c.type === 0).length;

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>${guildData.name} - Dashboard</title>
        <link rel="stylesheet" href="/styles.css">
      </head>
      <body>
        <div class="navbar">
          <a href="/servers" class="logo"><img src="/icono.png"><span>DV Dragons Bot</span></a>
        </div>

        <div class="dashboard-layout">
          <!-- Sidebar -->
          <aside class="dashboard-sidebar">
            <div class="sidebar-header">
              <img src="${icon}" alt="${guildData.name}" class="sidebar-server-icon">
              <div class="sidebar-server-info">
                <h3>${guildData.name}</h3>
                <p>Panel de Control</p>
              </div>
            </div>
            <nav class="sidebar-nav">
              <a href="/dashboard/${guildId}" class="sidebar-nav-item active">
                <span class="sidebar-icon">📊</span>
                <span>Server</span>
              </a>
              <a href="/dashboard/${guildId}/bienvenida" class="sidebar-nav-item">
                <span class="sidebar-icon">👋</span>
                <span>Bienvenida</span>
              </a>
            </nav>
          </aside>

          <!-- Main Content -->
          <main class="dashboard-main">
            <div class="welcome-header">
              <div class="welcome-icon">📊</div>
              <h1>Resumen del Servidor</h1>
              <p class="welcome-subtitle">Estadísticas rápidas sobre tu servidor de Discord</p>
            </div>

            <div class="server-overview">
              <div class="stat-card">
                <div class="stat-card-header">
                  <span class="stat-label">Miembros</span>
                  <span class="stat-icon">👥</span>
                </div>
                <div class="stat-value">${guildData.approximate_member_count || 'N/A'}</div>
                <div class="stat-description">Total de miembros</div>
              </div>

              <div class="stat-card">
                <div class="stat-card-header">
                  <span class="stat-label">Categorías</span>
                  <span class="stat-icon">📁</span>
                </div>
                <div class="stat-value">${categories}</div>
                <div class="stat-description">Categorías creadas</div>
              </div>

              <div class="stat-card">
                <div class="stat-card-header">
                  <span class="stat-label">Canales</span>
                  <span class="stat-icon">💬</span>
                </div>
                <div class="stat-value">${textChannels}</div>
                <div class="stat-description">Canales de texto</div>
              </div>

              <div class="stat-card">
                <div class="stat-card-header">
                  <span class="stat-label">Roles</span>
                  <span class="stat-icon">🎭</span>
                </div>
                <div class="stat-value">${roles.length}</div>
                <div class="stat-description">Roles configurados</div>
              </div>
            </div>

            <div class="server-id-section">
              <h3>🆔 ID del Servidor</h3>
              <div class="server-id-display">
                <code id="serverId">${guildId}</code>
                <button class="copy-btn" onclick="copyServerId()">Copiar</button>
              </div>
            </div>
          </main>
        </div>

        <footer class="footer"><p>© 2025 DV Dragons Bot.</p></footer>

        <script>
          function copyServerId() {
            const text = document.getElementById('serverId').textContent;
            navigator.clipboard.writeText(text).then(() => {
              const btn = document.querySelector('.copy-btn');
              const originalText = btn.textContent;
              btn.textContent = '✓ Copiado';
              setTimeout(() => {
                btn.textContent = originalText;
              }, 2000);
            });
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

// ⚙️ Dashboard - Sección Bienvenida
app.get("/dashboard/:guildId/bienvenida", async (req, res) => {
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

    // 🔹 Obtener emojis del servidor
    const emojisResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/emojis`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    );
    const emojis = await emojisResponse.json();

    // 🔹 Obtener roles del servidor
    const rolesResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/roles`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    );
    const roles = await rolesResponse.json();

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

    const icon = guildData.icon
      ? `https://cdn.discordapp.com/icons/${guildId}/${guildData.icon}.png`
      : "/icono.png";

    // 🔹 Preparar data para JS
    const emojisData = JSON.stringify(emojis.map(e => ({ id: e.id, name: e.name, animated: e.animated })));
    const channelsData = JSON.stringify(textChannels.map(c => ({ id: c.id, name: c.name })));
    const rolesData = JSON.stringify(roles.filter(r => r.name !== '@everyone').map(r => ({ id: r.id, name: r.name, color: r.color })));

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>${guildData.name} - Bienvenida</title>
        <link rel="stylesheet" href="/styles.css">
      </head>
      <body>
        <div class="navbar">
          <a href="/servers" class="logo"><img src="/icono.png"><span>DV Dragons Bot</span></a>
        </div>

        <div class="dashboard-layout">
          <!-- Sidebar -->
          <aside class="dashboard-sidebar">
            <div class="sidebar-header">
              <img src="${icon}" alt="${guildData.name}" class="sidebar-server-icon">
              <div class="sidebar-server-info">
                <h3>${guildData.name}</h3>
                <p>Panel de Control</p>
              </div>
            </div>
            <nav class="sidebar-nav">
              <a href="/dashboard/${guildId}" class="sidebar-nav-item">
                <span class="sidebar-icon">📊</span>
                <span>Server</span>
              </a>
              <a href="/dashboard/${guildId}/bienvenida" class="sidebar-nav-item active">
                <span class="sidebar-icon">👋</span>
                <span>Bienvenida</span>
              </a>
            </nav>
          </aside>

          <!-- Main Content -->
          <main class="dashboard-main">
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
                <div class="textarea-container">
                  <textarea id="message" rows="5" class="form-textarea" placeholder="Escribe un mensaje cálido para los nuevos miembros...">${current.texto || ""}</textarea>
                  <div class="textarea-toolbar">
                    <button type="button" class="toolbar-btn" onclick="togglePicker('emoji')" title="Emojis del servidor">
                      😀
                    </button>
                    <button type="button" class="toolbar-btn" onclick="togglePicker('channel')" title="Mencionar canal">
                      #
                    </button>
                    <button type="button" class="toolbar-btn" onclick="togglePicker('role')" title="Mencionar rol">
                      @
                    </button>
                  </div>
                </div>

                <!-- Picker de Emojis -->
                <div id="emojiPicker" class="picker-container" style="display: none;">
                  <div class="picker-header">
                    <span>Emojis del Servidor</span>
                    <button type="button" onclick="closePicker('emoji')" class="picker-close">✕</button>
                  </div>
                  <div class="picker-content" id="emojiList"></div>
                </div>

                <!-- Picker de Canales -->
                <div id="channelPicker" class="picker-container" style="display: none;">
                  <div class="picker-header">
                    <span>Mencionar Canal</span>
                    <button type="button" onclick="closePicker('channel')" class="picker-close">✕</button>
                  </div>
                  <div class="picker-content" id="channelList"></div>
                </div>

                <!-- Picker de Roles -->
                <div id="rolePicker" class="picker-container" style="display: none;">
                  <div class="picker-header">
                    <span>Mencionar Rol</span>
                    <button type="button" onclick="closePicker('role')" class="picker-close">✕</button>
                  </div>
                  <div class="picker-content" id="roleList"></div>
                </div>
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
          </main>
        </div>

        <footer class="footer"><p>© 2025 DV Dragons Bot.</p></footer>

        <script>
          const emojis = ${emojisData};
          const channels = ${channelsData};
          const roles = ${rolesData};

          // Cargar emojis
          document.addEventListener('DOMContentLoaded', () => {
            const emojiList = document.getElementById('emojiList');
            const channelList = document.getElementById('channelList');
            const roleList = document.getElementById('roleList');

            // Emojis
            if (emojis.length === 0) {
              emojiList.innerHTML = '<div class="picker-empty">No hay emojis personalizados</div>';
            } else {
              emojis.forEach(emoji => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'picker-item';
                btn.innerHTML = emoji.animated 
                  ? \`<img src="https://cdn.discordapp.com/emojis/\${emoji.id}.gif" alt="\${emoji.name}" class="emoji-img">\`
                  : \`<img src="https://cdn.discordapp.com/emojis/\${emoji.id}.png" alt="\${emoji.name}" class="emoji-img">\`;
                btn.title = emoji.name;
                btn.onclick = () => insertText(\`<:\${emoji.name}:\${emoji.id}>\`);
                emojiList.appendChild(btn);
              });
            }

            // Canales
            channels.forEach(channel => {
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.className = 'picker-item picker-text';
              btn.innerHTML = \`<span class="picker-icon">#</span> \${channel.name}\`;
              btn.onclick = () => insertText(\`<#\${channel.id}>\`);
              channelList.appendChild(btn);
            });

            // Roles
            roles.forEach(role => {
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.className = 'picker-item picker-text';
              const color = role.color ? '#' + role.color.toString(16).padStart(6, '0') : '#99aab5';
              btn.innerHTML = \`<span class="picker-icon" style="color: \${color}">@</span> \${role.name}\`;
              btn.onclick = () => insertText(\`<@&\${role.id}>\`);
              roleList.appendChild(btn);
            });
          });

          function togglePicker(type) {
            const pickers = ['emoji', 'channel', 'role'];
            pickers.forEach(p => {
              const picker = document.getElementById(p + 'Picker');
              if (p === type) {
                picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
              } else {
                picker.style.display = 'none';
              }
            });
          }

          function closePicker(type) {
            document.getElementById(type + 'Picker').style.display = 'none';
          }

          function insertText(text) {
            const textarea = document.getElementById('message');
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const before = textarea.value.substring(0, start);
            const after = textarea.value.substring(end);
            textarea.value = before + text + after;
            textarea.selectionStart = textarea.selectionEnd = start + text.length;
            textarea.focus();
            closePicker('emoji');
            closePicker('channel');
            closePicker('role');
          }

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