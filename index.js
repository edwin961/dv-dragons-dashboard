// 1. Cargar las variables de seguridad
require('dotenv').config();
const express = require('express');
// Solución de compatibilidad para fetch en Node.js (TypeError: fetch is not a function)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)); 
const app = express();
const PORT = process.env.PORT || 3000;

// Claves del archivo .env
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Configuración de Express para servir archivos estáticos (CSS)
app.use(express.static('public')); 

// Ruta inicial (Muestra el botón de Login)
app.get('/', (req, res) => {
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
    
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Dashboard de Bot</title>
            <link rel="stylesheet" href="/styles.css">
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
                    <p>Gestiona la configuración de DV Dragons Bot de manera simple y eficiente desde nuestro panel de control</p>
                    <a href="${discordAuthUrl}" class="discord-button">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
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


// Ruta de Discord (aquí llega el usuario después de iniciar sesión)
app.get('/callback', async (req, res) => {
    const code = req.query.code; 

    if (!code) {
        return res.status(400).send("Faltó el código de autorización. Intenta de nuevo.");
    }

    try {
        // Petición 1: Intercambiar el código por un "Access Token"
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error('Error al obtener token:', tokenData);
            return res.status(500).send("Error al iniciar sesión. Revisa tus credenciales.");
        }

        const accessToken = tokenData.access_token;
        
        // Petición 2: Usar el token para obtener la lista de servidores del usuario
        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: {
                authorization: `Bearer ${accessToken}`,
            },
        });
        const guildsData = await guildsResponse.json();

        // --- Filtro Clave ---
        const MANAGE_GUILD_PERMISSION = 32; 

        const administrableGuilds = guildsData.filter(guild => {
            return (parseInt(guild.permissions) & MANAGE_GUILD_PERMISSION) === MANAGE_GUILD_PERMISSION;
        });

        // Mostrar la lista
        let guildListHTML = '';
        if (administrableGuilds.length > 0) {
            guildListHTML += '<div class="servers-grid">';
            administrableGuilds.forEach(guild => {
                const iconUrl = guild.icon 
                    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
                    : '/icono.png';
                guildListHTML += `
                    <div class="server-card">
                        <img src="${iconUrl}" alt="${guild.name}" class="server-icon">
                        <div class="server-info">
                            <h3>${guild.name}</h3>
                            <p class="server-id">ID: ${guild.id}</p>
                        </div>
                        <a href="/dashboard/${guild.id}" class="config-btn">Configurar</a>
                    </div>
                `;
            });
            guildListHTML += '</div>';
        } else {
             guildListHTML += `<div class="empty-state"><p>No se encontraron servidores donde tengas el permiso "Administrar Servidor".</p></div>`;
        }

        res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Dashboard - Servidores</title>
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
                    <p class="subtitle">Selecciona un servidor para comenzar a configurar</p>
                    ${guildListHTML}
                </div>

                <footer class="footer">
                    <p>© 2025 DV Dragons Bot. Todos los derechos reservados.</p>
                </footer>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('Error en el proceso de callback:', error);
        res.status(500).send("Ocurrió un error en el servidor.");
    }
});

// Ruta de ejemplo para configurar un servidor
app.get('/dashboard/:guildId', (req, res) => {
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
                <a href="/callback?code=placeholder" class="back-link">
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

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor Express escuchando en http://localhost:${PORT}`);
});