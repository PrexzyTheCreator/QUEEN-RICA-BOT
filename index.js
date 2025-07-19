require('dotenv').config();
const {
    default: makeWASocket,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    makeInMemoryStore,
    jidDecode,
    proto,
    delay,
    getMessage,
    Browsers
} = require('@whiskeysockets/baileys');

const fs = require("fs");
const path = require("path");
const unzipper = require("unzipper");
const readline = require("readline");
const chalk = require("chalk");
const Pino = require("pino");
const axios = require("axios");
const handleListeners = require("./AizenTech");
const config = require("./config");
const excludedFiles = ['index.js'];
const watchedModules = new Map();
const http = require('http');
const PORT = process.env.PORT || Math.floor(Math.random() * (9000 - 1000 + 1)) + 1000;

const getRandomColor = () => `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`;
const store = makeInMemoryStore({ logger: Pino().child({ level: "silent" }) });

const question = (text) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(text, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
};

let ToxxicTech;
let restartCount = 0;
const MAX_RESTARTS = 3;

async function connectBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir || "session");
        const { version } = await fetchLatestBaileysVersion();

        ToxxicTech = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: "fatal" })),
            },
            logger: Pino({ level: "silent" }),
            printQRInTerminal: false,
            browser: Browsers.windows("Safari"),
            syncFullHistory: true,
            generateHighQualityLinkPreview: true,
            shouldSyncHistoryMessage: (msg) => true,
            getMessage,
        });

        store.bind(ToxxicTech.ev);
        ToxxicTech.ev.on("creds.update", saveCreds);

        if (!ToxxicTech.authState.creds.registered) {
            const pair = "IAMAIZEN";
            console.log(chalk.hex(getRandomColor()).bold(`\n🔗 Send Your WhatsApp Number?\n`));
            const phoneNumber = await question(chalk.yellow("📲 Enter your phone number with country code: "));
            let code = await ToxxicTech.requestPairingCode(phoneNumber, pair);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log(chalk.hex(getRandomColor()).bold(`\n🔗 Your Pairing Code:\n\n${code}\n`));
        }

        ToxxicTech.ev.on("messages.upsert", async ({ messages }) => {
            for (const message of messages) {
                await handleListeners(ToxxicTech, message);
            }
        });
                
if (config.anticall) {
    ToxxicTech.ev.on('call', async (callData) => {
        for (const call of callData) {
            const callerId = call.from;
            const isVideoCall = call.isVideo;

            console.log(chalk.red(`📞 Incoming call from ${callerId}. Type: ${isVideoCall ? "Video" : "Audio"}`));

            const rejectionMessage = `📞 *Greetings, caller!* \n\n` +
            `Unfortunately, *${config.ownerName}* is currently unavailable and does not accept incoming calls.\n` +
            `Your call has been automatically rejected, but your attempt has been noted. Please try again later, if necessary.\n\n` +
            `- *Sosuke Aizen*\n` +
            `*Note:* This service is automated and designed to respect my Master's privacy. Thank you for understanding.`;

            try {
                console.log(chalk.red(`🚫 Rejecting call from ${callerId}...`));
                await ToxxicTech.rejectCall(call.id, callerId);
                await delay(1500);
                await ToxxicTech.sendMessage(callerId, { text: rejectionMessage });
                console.log(chalk.red(`🚫 ${callerId} has been rejected for calling the bot.`));
            } catch (error) {
                console.error(chalk.red('❌ Error handling call rejection:'), error.message);
            }
        }
    });
}

        ToxxicTech.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            const reason = lastDisconnect?.error?.output?.statusCode;

            switch (connection) {
                case "open":
                    console.log(chalk.green("Aizen Md Has Connected Successfully✅"));
                    followNewsletter("120363336528578108@newsletter");
                    break;

                case "close":
                    console.log(chalk.red("⚠️ Lost connection. Reawakening..."));
                    if (reason === 401) {
                        console.log(chalk.red("❌ Authentication failed. Purge 'session' and restart."));
                    } else if (reason === 403) {
                        console.log(chalk.red("🚫 Banned from the battlefield. Get a new number."));
                    } else if (reason === 408) {
                        console.log(chalk.yellow("⏳ Delay detected. Retrying in 5 seconds..."));
                        setTimeout(connectBot, 5000);
                    } else if (reason === 440) {
                        console.log(chalk.red("🛑 Session expired. Reforge the link."));
                    } else if (reason === 500) {
                        console.log(chalk.red("⚡ Internal disruption. Restarting..."));
                        setTimeout(connectBot, 5000);
                    } else if (reason === 503) {
                        console.log(chalk.yellow("🛠️ WhatsApp down. Retrying in 1 minute..."));
                        setTimeout(connectBot, 60000);
                    } else if (reason === 515) {
                        console.log(chalk.red("⚠️ Reconnection needed."));
                        await connectBot();
                    } else {
                        console.log(chalk.yellow("🔄 Unknown interference. Retrying in 5 seconds..."));
                        setTimeout(connectBot, 5000);
                    }
                    break;

                case "connecting":
                    console.log(chalk.blue("🔄 Reconnecting to Servers..."));
                    break;

                case "disconnected":
                    console.log(chalk.red("❌ Connection lost. Preparing a new link..."));
                    setTimeout(connectBot, 5000);
                    break;

                default:
                    console.log(chalk.magenta(`ℹ️ Status: ${connection || "Unknown"}`));
            }
        });

    } catch (error) {
        console.error(chalk.red("\n💥 An Error Has Been Detected: "), error);

        if (restartCount < MAX_RESTARTS) {
            restartCount++;
            console.log(chalk.yellow(`🔄 Respawning in 2 seconds... (${restartCount}/${MAX_RESTARTS})\n`));
            setTimeout(connectBot, 2000);
        } else {
            console.log(chalk.red("🚨 Maximum attempts reached! Manual restart required."));
        }
    }
}

function followNewsletter(channelId) {
    try {
        ToxxicTech.newsletterFollow(channelId);
        console.log(`Following ${channelId}`);
    } catch (error) {
        console.error('Newsletter follow error:', error);
    }
}

async function downloadAndUnzipSession(sessionUrl) {
    const sessionDir = config.sessionDir || "session";
    const zipPath = path.join(sessionDir, "creds.zip");

    if (!sessionUrl || !sessionUrl.startsWith("http")) {
        console.error("❌ Invalid session URL");
        return false;
    }

    try {
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir);
        }

        console.log("⬇️ Downloading session zip from URL...");
        const response = await axios({
            url: sessionUrl,
            method: "GET",
            responseType: "stream",
            timeout: 30000
        });

        const writer = fs.createWriteStream(zipPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        console.log("✅ Session zip downloaded.");

        console.log("📂 Unzipping session files...");
        await fs.createReadStream(zipPath)
            .pipe(unzipper.Extract({ path: sessionDir }))
            .promise();

        console.log("✅ Session unzipped successfully.");
        fs.unlinkSync(zipPath);
        return true;

    } catch (err) {
        console.error("🔥 Error downloading or unzipping session:", err.message);
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        return false;
    }
}

async function startBot() {
    await connectBot();
}

async function initializeBot() {
    if (config.sessionId && config.sessionId.startsWith("http")) {
        console.log("🔄 Found sessionId in config, attempting to download session...");
        const success = await downloadAndUnzipSession(config.sessionId);
        if (!success) {
            console.log("🆕 Proceeding with fresh session...");
        }

        console.log("⏳ Waiting for session files to be ready...");
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    await startBot();
}

if (config.sessionId) {
    console.log("🔍 Session ID found in config, initializing bot...");
    initializeBot();
} else {
    console.log("🚀 No session ID found, starting bot with fresh session...");
    startBot();
}


function hotReloadModule(file) {
    const fullPath = path.resolve(__dirname, file);
    try {
        delete require.cache[require.resolve(fullPath)];
        const updatedModule = require(fullPath);
        watchedModules.set(file, updatedModule);
        console.log(chalk.greenBright(`🔄 Reloaded module: ${file}`));
    } catch (err) {
        console.error(chalk.red(`❌ Failed to reload ${file}:`, err.message));
    }
}

fs.readdirSync(__dirname).forEach(file => {
    if (
        excludedFiles.includes(file) ||
        file.startsWith('.') ||
        !file.endsWith('.js') ||
        fs.statSync(path.join(__dirname, file)).isDirectory()
    ) return;

    const fullPath = path.join(__dirname, file);
    watchedModules.set(file, require(fullPath));

    fs.watch(fullPath, { persistent: true }, (eventType) => {
        if (eventType === 'change') {
            hotReloadModule(file);
        }
    });
});

http.createServer((req, res) => {
    if (req.url === '/') {
        const filePath = path.join(__dirname, 'AizenByToxxic', 'Aizen.html');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500: Internal Server Error');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404: Not Found');
    }
}).listen(PORT, () => console.log(`🌐 Aizen is running on port ${PORT}`));