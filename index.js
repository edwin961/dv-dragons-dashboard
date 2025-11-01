require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('Public'));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// =============== RUTA DE INICIO ===============
app.get('/', (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>DV Dragons Bot</title>
    <link rel="stylesheet" href="/styles.css" />
    <style>
      body {
        background-color: #0f172a;
        color: #fff;
        font-family: 'Inter', sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        text-align: center;
      }
      h1 {
        font-size: 2.5rem;
        color: #38bdf8;
      }
      p {
        color: #94a3b8;
      }
      .btn {
        background: #38bdf8;
        border: none;
        padding: 12px 25px;
        color: #0f172a;
        font-weight: 700;
        border-radius: 10px;
        text-decoration: none;
        margin-top: 20px;
        transition: 0.2s;
      }
      .btn:hover {
        background: #7dd3fc;
      }
      img {
        width: 120px;
        border-radius: 50%;
        margin-bottom: 20px;
      }
    </style>
  </head>
  <body>
    <img src="/icono.png" alt="DV Dragons Bot">
    <h1>DV Dragons Dashboard</h1>
    <p>Gestiona tus servidores y configura tu bot con facilidad.</p>
    <a href="/login" class="btn">Iniciar con Discord</a>
  </body>
  </html>
  `;
  res.send(html);
});

// =============== LOGIN DISCORD ===============
app.get('/login', (req, res) => {
  const redirect = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(
    process.env.REDIRECT_URI
  )}&response_type=code&scope=identify%20guilds`;
  res.redirect(redirect);
});

// =============== CALLBACK DISCORD ===============
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect('/');

  try {
    const data = new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.REDIRECT_URI,
    });

    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: data,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const tokens = await response.json();

    const userData = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `${tokens.token_type} ${tokens.access_token}` },
    }).then((r) => r.json());

    const guildsData = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `${tokens.token_type} ${tokens.access_token}` },
    }).then((r) => r.json());

    req.session.user = userData;
    req.session.guilds = guildsData;

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error en callback:', err);
    res.send('Error al iniciar sesión.');
  }
});

// =============== DASHBOARD SERVIDORES ===============
app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const user = req.session.user;
  const guilds = req.session.guilds;

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Panel - DV Dragons</title>
    <link rel="stylesheet" href="/styles.css" />
    <style>
      body {
        background-color: #0f172a;
        color: #fff;
        font-family: "Inter", sans-serif;
        margin: 0;
        padding: 0;
      }
      header {
        background-color: #1e293b;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 15px 30px;
      }
      header .logo {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      header .logo img {
        width: 40px;
        height: 40px;
        border-radius: 50%;
      }
      header .logo h1 {
        font-size: 20px;
        color: #38bdf8;
        margin: 0;
      }
      header .user {
        color: #cbd5e1;
      }
      main {
        padding: 30px;
      }
      .guilds {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 20px;
      }
      .guild {
        background: #1e293b;
        border-radius: 12px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 15px;
        transition: 0.2s;
      }
      .guild:hover {
        transform: translateY(-5px);
        box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
      }
      .guild img {
        width: 48px;
        height: 48px;
        border-radius: 50%;
      }
      .guild .info {
        flex: 1;
      }
      .guild .info h3 {
        margin: 0;
        font-size: 16px;
      }
      .guild .info p {
        margin: 0;
        color: #94a3b8;
      }
      .guild a {
        background: #38bdf8;
        color: #0f172a;
        padding: 8px 12px;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <header>
      <div class="logo">
        <img src="/icono.png" alt="DV Bot" />
        <h1>DV Dragons Bot</h1>
      </div>
      <div class="user">${user.username}#${user.discriminator}</div>
    </header>

    <main>
      <h2>Manage Servers</h2>
      <div class="guilds">
        ${guilds
          .map(
            (g) => `
          <div class="guild">
            <img src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png" alt="${g.name}" />
            <div class="info">
              <h3>${g.name}</h3>
              <p>${g.owner ? "Owner" : "Admin"}</p>
            </div>
            <a href="/dashboard/${g.id}">+</a>
          </div>`
          )
          .join("")}
      </div>
    </main>
  </body>
  </html>`;
  res.send(html);
});

// =============== PANEL DE UN SERVIDOR ===============
app.get('/dashboard/:guildId', (req, res) => {
  const guildId = req.params.guildId;
  res.send(`<h1>Panel del servidor ${guildId}</h1><a href="javascript:history.back()">Volver</a>`);
});

// Inicia servidor
app.listen(PORT, () => console.log(`✅ Servidor iniciado en puerto ${PORT}`));
