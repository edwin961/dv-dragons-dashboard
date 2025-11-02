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
          }>#${c.name}</option>`
      )
      .join("");

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
        <div class="navbar"><a href="/servers" class="logo"><img src="/icono.png"><span>DV Dragons Bot</span></a></div>
        <div class="dashboard-container welcome-config">
          <div class="config-header-modern">
            <div class="config-icon-dragon">🐉</div>
            <h1>Mensajes de Bienvenida</h1>
            <p class="config-subtitle">Configura el mensaje que aparecerá al servicio de Discord.</p>
          </div>

          <div class="welcome-form-modern">
            <!-- CANAL -->
            <div class="form-group-modern">
              <label class="form-label-modern">
                <span class="label-text">CANAL</span>
                <span class="label-hint">Elige en qué canal de envío el mensaje de bienvenida.</span>
              </label>
              <select id="channel" class="form-select-modern">
                <option value="">Selecciona un canal...</option>
                ${channelOptions}
              </select>
            </div>

            <!-- MENSAJE INTEGRADO -->
            <div class="form-group-modern">
              <label class="form-label-modern">
                <span class="label-text">MENSAJE INTEGRADO</span>
              </label>
              <div class="toggle-switch">
                <input type="checkbox" id="embedToggle" ${current.texto ? 'checked' : ''}>
                <label for="embedToggle" class="toggle-label"></label>
              </div>
            </div>

            <!-- ENCABEZADO -->
            <div class="form-group-modern">
              <label class="form-label-modern">
                <span class="label-text">ENCABEZADO PERSONALIZADO</span>
                <span class="label-hint">Este es el primer texto en mayúscula de un mensaje de bienvenida, Este texto aparece en el canal de bienvenida y destaca el nombre del usuario con variables dinámicas. Usa [Usuario] para mencionar al nuevo miembro</span>
              </label>
              <input type="text" id="header" class="form-input-modern" placeholder="¡[Usuario] llegó al servidor!" value="${current.encabezado || ''}">
            </div>

            <!-- DESCRIPCIÓN -->
            <div class="form-group-modern">
              <label class="form-label-modern">
                <span class="label-text">DESCRIPCIÓN</span>
                <span class="label-hint">Puedes usar variables en el mensaje: [Usuario], [Servidor]. Esto es un mensaje que describe el mensaje y contiene los detalles del mensaje. También se llama el "cuerpo" del mensaje. Este desempeño se muestra en el contenido del mensaje de bienvenida</span>
              </label>
              <div class="textarea-wrapper-modern">
                <textarea id="message" rows="6" class="form-textarea-modern" placeholder="¡Bienvenido a [Servidor]! 🎉">${current.texto || ''}</textarea>
                <div class="textarea-toolbar-modern">
                  <button type="button" class="toolbar-btn-modern" onclick="togglePicker('emoji')" title="Emojis">
                    <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
                  </button>
                  <button type="button" class="toolbar-btn-modern" onclick="togglePicker('channel')" title="Mencionar canal">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.88657 21C5.57547 21 5.3399 20.7189 5.39427 20.4126L6.00001 17H2.59511C2.28449 17 2.04905 16.7198 2.10259 16.4138L2.27759 15.4138C2.31946 15.1746 2.52722 15 2.77011 15H6.35001L7.41001 9H4.00511C3.69449 9 3.45905 8.71977 3.51259 8.41381L3.68759 7.41381C3.72946 7.17456 3.93722 7 4.18011 7H7.76001L8.39677 3.41262C8.43914 3.17391 8.64664 3 8.88907 3H9.87344C10.1845 3 10.4201 3.28107 10.3657 3.58738L9.76001 7H15.76L16.3968 3.41262C16.4391 3.17391 16.6466 3 16.8891 3H17.8734C18.1845 3 18.4201 3.28107 18.3657 3.58738L17.76 7H21.1649C21.4755 7 21.711 7.28023 21.6574 7.58619L21.4824 8.58619C21.4406 8.82544 21.2328 9 20.9899 9H17.41L16.35 15H19.7549C20.0655 15 20.301 15.2802 20.2474 15.5862L20.0724 16.5862C20.0306 16.8254 19.8228 17 19.5799 17H16L15.3632 20.5874C15.3209 20.8261 15.1134 21 14.8709 21H13.8866C13.5755 21 13.3399 20.7189 13.3943 20.4126L14 17H8.00001L7.36325 20.5874C7.32088 20.8261 7.11337 21 6.87094 21H5.88657ZM9.41045 9L8.35045 15H14.3504L15.4104 9H9.41045Z"/></svg>
                  </button>
                  <button type="button" class="toolbar-btn-modern" onclick="togglePicker('role')" title="Mencionar rol">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/></svg>
                  </button>
                  <button type="button" class="toolbar-btn-modern" onclick="togglePicker('variable')" title="Variables">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
                  </button>
                </div>
              </div>

              <!-- Pickers -->
              <div id="emojiPicker" class="picker-modern" style="display: none;">
                <div class="picker-header-modern">
                  <span>Emojis del Servidor</span>
                  <button type="button" onclick="closePicker('emoji')" class="picker-close-modern">✕</button>
                </div>
                <div class="picker-content-modern" id="emojiList"></div>
              </div>

              <div id="channelPicker" class="picker-modern" style="display: none;">
                <div class="picker-header-modern">
                  <span>Mencionar Canal</span>
                  <button type="button" onclick="closePicker('channel')" class="picker-close-modern">✕</button>
                </div>
                <div class="picker-content-modern picker-list" id="channelList"></div>
              </div>

              <div id="rolePicker" class="picker-modern" style="display: none;">
                <div class="picker-header-modern">
                  <span>Mencionar Rol</span>
                  <button type="button" onclick="closePicker('role')" class="picker-close-modern">✕</button>
                </div>
                <div class="picker-content-modern picker-list" id="roleList"></div>
              </div>

              <div id="variablePicker" class="picker-modern" style="display: none;">
                <div class="picker-header-modern">
                  <span>Variables Disponibles</span>
                  <button type="button" onclick="closePicker('variable')" class="picker-close-modern">✕</button>
                </div>
                <div class="picker-content-modern picker-list">
                  <button type="button" class="picker-item-modern picker-text-modern" onclick="insertText('[Usuario]')">
                    <span class="picker-icon-modern">👤</span> [Usuario]
                    <span class="picker-desc">Menciona al nuevo miembro</span>
                  </button>
                  <button type="button" class="picker-item-modern picker-text-modern" onclick="insertText('[Servidor]')">
                    <span class="picker-icon-modern">🏰</span> [Servidor]
                    <span class="picker-desc">Nombre del servidor</span>
                  </button>
                  <button type="button" class="picker-item-modern picker-text-modern" onclick="insertText('[Miembros]')">
                    <span class="picker-icon-modern">👥</span> [Miembros]
                    <span class="picker-desc">Total de miembros</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- IMAGEN -->
            <div class="form-group-modern">
              <label class="form-label-modern">
                <span class="label-text">IMAGEN DEL EMBEBIDO</span>
              </label>
              <div class="image-upload-area" onclick="document.getElementById('gif').focus()">
                ${current.gif ? `<img src="${current.gif}" class="preview-image" onerror="this.src='/icono.png'">` : '<div class="upload-placeholder"><span class="upload-icon">🖼️</span><span>Imagen del embebido</span></div>'}
              </div>
              <input type="url" id="gif" class="form-input-modern" placeholder="Pegar URL de una imagen" value="${current.gif || ''}" style="margin-top: 1rem;">
            </div>

            <!-- BOTONES -->
            <div class="form-actions-modern">
              <button type="button" class="btn-test-modern" onclick="testMessage()">Probar mensaje</button>
              <button type="button" class="btn-save-modern" onclick="guardar()">
                <span class="btn-icon-modern">💾</span>
                Guardar cambios (100%)
              </button>
            </div>
          </div>
        </div>

        <script>
          const emojis = ${emojisData};
          const channels = ${channelsData};
          const roles = ${rolesData};

          document.addEventListener('DOMContentLoaded', () => {
            const emojiList = document.getElementById('emojiList');
            const channelList = document.getElementById('channelList');
            const roleList = document.getElementById('roleList');

            // Emojis
            if (emojis.length === 0) {
              emojiList.innerHTML = '<div class="picker-empty-modern">No hay emojis personalizados</div>';
            } else {
              emojis.forEach(emoji => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'picker-item-modern';
                btn.innerHTML = emoji.animated 
                  ? \`<img src="https://cdn.discordapp.com/emojis/\${emoji.id}.gif" alt="\${emoji.name}" class="emoji-img-modern">\`
                  : \`<img src="https://cdn.discordapp.com/emojis/\${emoji.id}.png" alt="\${emoji.name}" class="emoji-img-modern">\`;
                btn.title = emoji.name;
                btn.onclick = () => insertText(\`<:\${emoji.name}:\${emoji.id}>\`);
                emojiList.appendChild(btn);
              });
            }

            // Canales
            channels.forEach(channel => {
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.className = 'picker-item-modern picker-text-modern';
              btn.innerHTML = \`<span class="picker-icon-modern">#</span> \${channel.name}\`;
              btn.onclick = () => insertText(\`<#\${channel.id}>\`);
              channelList.appendChild(btn);
            });

            // Roles
            roles.forEach(role => {
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.className = 'picker-item-modern picker-text-modern';
              const color = role.color ? '#' + role.color.toString(16).padStart(6, '0') : '#99aab5';
              btn.innerHTML = \`<span class="picker-icon-modern" style="color: \${color}">@</span> \${role.name}\`;
              btn.onclick = () => insertText(\`<@&\${role.id}>\`);
              roleList.appendChild(btn);
            });
          });

          function togglePicker(type) {
            const pickers = ['emoji', 'channel', 'role', 'variable'];
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
            closePicker('variable');
          }

          function testMessage() {
            alert('🧪 Función de prueba en desarrollo');
          }

          async function guardar() {
            const btn = document.querySelector('.btn-save-modern');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="btn-icon-modern">⏳</span> Guardando...';
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
              
              btn.innerHTML = '<span class="btn-icon-modern">✅</span> ¡Guardado correctamente!';
              setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
              }, 2000);
              
              alert(result.message || "✅ Configuración guardada.");
            } catch (error) {
              btn.innerHTML = '<span class="btn-icon-modern">❌</span> Error al guardar';
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