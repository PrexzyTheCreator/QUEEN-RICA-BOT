require("dotenv").config();

const config = {
    prefix: process.env.BOT_PREFIX || '.',
    premium: process.env.BOT_PREMIUM || '2349159895444',
    owner: process.env.BOT_OWNER || '2349159895444', 
    ownerName: process.env.BOT_OWNER_NAME || 'Aizen Tech', 
    anticall: process.env.ANTICALL?.toLowerCase() === "true" || true,
    sessionId: process.env.SESSION_ID || '', 
    sessionDir: process.env.SESSION_DIR || 'session',
    presenceState: process.env.WA_PRESENCE || 'composing' 
};

module.exports = config;