

const { generateMessageIDV2, WA_DEFAULT_EPHEMERAL, getAggregateVotesInPollMessage, generateWAMessageFromContent, proto, generateWAMessageContent, generateWAMessage, prepareWAMessageMedia, downloadContentFromMessage, areJidsSameUser, getContentType, useMultiFileAuthState, makeWASocket, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, makeWaSocket } = require("@whiskeysockets/baileys")

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const config = require("./config");
const os = require('os');
const process = require('process');
const moment = require('moment-timezone');
const { spawn } = require("child_process");
const chalk = require("chalk");
const prefix = config.prefix || " "
let botMode = "private";



const banListener = require("./listeners/banListener");



function getUptime() {
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    return `${hours}h ${minutes}m ${seconds}s`;
}

function getCpuUsage() {
    const startUsage = process.cpuUsage();
    const startTime = process.hrtime();
    const waitTime = 100;
    const start = Date.now();
    while (Date.now() - start < waitTime);
    const endUsage = process.cpuUsage(startUsage);
    const endTime = process.hrtime(startTime);
    const elapsedTime = (endTime[0] * 1e9 + endTime[1]) / 1e6;
    const cpuTime = (endUsage.user + endUsage.system) / 1e3; 
    const cpuUsage = Math.round((cpuTime / elapsedTime) * 100);
    return `${cpuUsage}%`;
}


function getRamUsage() {
    const memoryUsage = process.memoryUsage();
    const usedRam = memoryUsage.rss; 
    const totalRam = os.totalmem();
    const ramUsage = Math.round((usedRam / totalRam) * 100);
    return `${ramUsage}%`;
}

function getNigeriaTime() {
    return moment().tz('Africa/Lagos').format('h:mm:ss A');
}

async function getPing() {
    const startTime = process.hrtime();
    await new Promise(resolve => setTimeout(resolve, 10)); 
    const diff = process.hrtime(startTime);
    return (diff[0] * 1e3 + diff[1] / 1e6).toFixed(2) + " ms";
}

function getSystemInfo() {
    return `OS: ${os.type()} ${os.release()} (${os.arch()})`;
}

async function ToxxicReply(ToxxicTech, to, text, quoted = null) {
    const imageUrl = "https://files.catbox.moe/lj0a37.jpeg"; 

    const message = {
        image: { url: imageUrl },
        caption: text.trim(),
        contextInfo: {
            forwardingScore: 99999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363400709382646@newsletter", 
                newsletterName: "𝐀𝐈𝐙𝐄𝐍 𝐒𝐎𝐒𝐔𝐊𝐄 𝐌𝐃",
                serverMessageId: 100
            },
            externalAdReply: {
                showAdAttribution: true,
                title: "𝐀𝐈𝐙𝐄𝐍 𝐒𝐎𝐒𝐔𝐊𝐄",
                body: "𝐌𝐀𝐃𝐄 𝐁𝐘 𝐓𝐎𝐗𝐗𝐈𝐂",
                mediaType: 1,
                previewType: "PHOTO",
                thumbnailUrl: imageUrl,
                mediaUrl: "https://whatsapp.com/channel/0029Vb54jEH0rGiDgUkRQa0c",
                sourceUrl: "https://whatsapp.com/channel/0029Vb54jEH0rGiDgUkRQa0c"
            }
        }
    };

    const options = quoted ? { quoted } : {};
    await ToxxicTech.sendMessage(to, message, options);
}

// await ToxxicReply(sock, m.key.remoteJid, "🔥 Mode changed to *PUBLIC*", m);

module.exports = async (ToxxicTech, m) => {
    if (!m.message) return;
await banListener(ToxxicTech, m);

const from = m.key.remoteJid;
const isGroup = from.endsWith('@g.us');
const sender = m.key.participant || from; 
const isOwner = m.key.fromMe;


await ToxxicTech.sendPresenceUpdate(config.presenceState, m.key.remoteJid); 


let text = "";
let messageType = "";
let isButtonCommand = false;
let isListCommand = false;
let isTemplateCommand = false;
let isInteractiveCommand = false;

if (m.message.conversation) {
    text = m.message.conversation;
    messageType = 'text';
} else if (m.message.extendedTextMessage) {
    text = m.message.extendedTextMessage.text;
    messageType = 'extendedText';
} else if (m.message.buttonsResponseMessage) {
    text = m.message.buttonsResponseMessage.selectedButtonId;
    messageType = 'button';
    isButtonCommand = true;
} else if (m.message.listResponseMessage) {
    text = m.message.listResponseMessage.singleSelectReply.selectedRowId;
    messageType = 'list';
    isListCommand = true;
} else if (m.message.templateButtonReplyMessage) {
    text = m.message.templateButtonReplyMessage.selectedId;
    messageType = 'templateButton';
    isTemplateCommand = true;
} else if (m.message.interactiveResponseMessage?.nativeFlowResponseMessage) {
    try {
        const params = JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
        text = params.id || params.url || m.message.interactiveResponseMessage.nativeFlowResponseMessage.name;
    } catch (e) {
        text = m.message.interactiveResponseMessage.nativeFlowResponseMessage.name;
    }
    messageType = 'interactive';
    isInteractiveCommand = true;
} else {
    messageType = Object.keys(m.message)[0] || "";
    text = m.message[messageType]?.text || "";
}

const groupMetadata = isGroup ? await ToxxicTech.groupMetadata(from) : {};
const groupAdmins = isGroup ? groupMetadata.participants.filter(p => p.admin).map(p => p.id) : [];
const isAdmin = isGroup && groupAdmins.includes(sender);

const quotedMessage = m.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
const quotedText =
  quotedMessage?.conversation ||
  quotedMessage?.imageMessage?.caption ||
  quotedMessage?.videoMessage?.caption ||
  quotedMessage?.documentMessage?.caption ||
  quotedMessage?.extendedTextMessage?.text ||
  null;

const mediaMessage =
  m.message.imageMessage ||
  m.message.videoMessage ||
  m.message.stickerMessage ||
  m.message.documentMessage ||
  m.message.audioMessage ||
  null;

const isButtonResponse = !!m.message?.buttonsResponseMessage;
const isListResponse = !!m.message?.listResponseMessage;
const buttonReplyText = isButtonResponse
  ? m.message.buttonsResponseMessage.selectedButtonId
  : isListResponse
  ? m.message.listResponseMessage.singleSelectReply.selectedRowId
  : null;

const mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

const quotedStatusAizen = {
    key: {
        remoteJid: "status@broadcast",
        fromMe: false,
        id: "BAE5F2DC76F3123456",
        participant: from
    },
    message: {
        imageMessage: {
            caption: "I Am Aizen",
            mimetype: "image/jpeg"
        }
    },
    pushName: "Base By Toxxic",
    timestamp: Math.floor(Date.now() / 1000)
};

console.log(
  `${chalk.blue('[MESSAGE RECEIVED]')} 📝 From: ${chalk.blue(from)} | 🗣️ Type: ${chalk.blue(messageType)} | 💬 Content: ${chalk.blue(text.substring(0, 50))}${text.length > 50 ? '... ✨' : ''}`
);

if (botMode === "private" && !m.key.fromMe) return;

let command, args, q = quotedMessage || ''; 
try {
    if (isButtonCommand || isListCommand || isTemplateCommand || isInteractiveCommand) {
        const content = text.trim();
        [command, ...args] = content.split(/\s+/);
        q = args.join(" ").trim() || q;
    } 
    else if (text.startsWith(config.prefix)) {
        const content = text.slice(config.prefix.length).trim();
        [command, ...args] = content.split(/\s+/);
        q = args.join(" ").trim() || quotedMessage || '';
    } else {
        return; 
    }
    command = command.toLowerCase();
    q = q.trim();
    console.log(
      `${chalk.green('[COMMAND RECEIVED]')} ${chalk.green(command)} | ${chalk.green('Args:')} ${chalk.green(args.length)} | ${chalk.green('Query:')} ${chalk.green(q || '(none)')}`
    );    

} catch (error) {
    console.error(`[ERROR] Processing command:`, error);
    await ToxxicReply(ToxxicTech, from, "🚨 Error processing your command. Please try again.");
}
    switch (command) {
        case "menu": {       
const menuText = `┏━━━━━━━━━━◆✦◆━━━━━━━━━━━
┃　      𝐀𝐈𝐙𝐄𝐍 𝐒𝐎𝐒𝐔𝐊𝐄 𝐌𝐃
┗━━┯━━━━━━◆✦◆━━━━━━┯━━━━━
┏━━━━━━━━━━━━━━━━━━━━━━━━━
┃ 🔰  *𝐔𝐒𝐄𝐑 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍* 🔰 
┃ 𝐔𝐒𝐄𝐑 ➼ ${m.pushName}     
┃ 𝐎𝐖𝐍𝐄𝐑 ➼ ${config.ownerName}          
┃ 𝐍𝐔𝐌𝐁𝐄𝐑 ➼  ${config.owner}   
┠─────────────────────
┃ 🌀  *𝐒𝐘𝐒𝐓𝐄𝐌 𝐈𝐍𝐅𝐎* 🌀    
┃ ⏳  𝐔𝐏𝐓𝐈𝐌𝐄 ➼ ${getUptime()}      
┃ 🚀  𝐏𝐈𝐍𝐆 ➼ ${await getPing()}      
┃ 💎  𝐑𝐀𝐌 ➼ ${getRamUsage()}
┃ ✍️ 𝐏𝐑𝐄𝐅𝐈𝐗 ➼  ${config.prefix}   
┠─────────────────────
┃ ♂️ *𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 𝐋𝐈𝐒𝐓* ♂️
┠─────────────────────
┃ *𝐀𝐈*
┃ - ᴄʟᴀᴜᴅᴇ
┃ - ɢᴘᴛ3
┃ - ɢᴘᴛ4
┃ - ᴠᴇʀɴɪᴄᴇ
┠─────────────────────
┃ *𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑*
┃ - ɪɴsᴛᴀɢʀᴀᴍ
┃ - ᴛɪᴋᴛᴏᴋ
┃ - ᴛᴡɪᴛᴛᴇʀ
┃ - ʏᴛᴍᴘ4
┠─────────────────────
┃ *𝐆𝐄𝐍𝐄𝐑𝐀𝐋*
┃ - ᴏᴡɴᴇʀ
┃ - ᴘɪɴɢ
┃ - ʀᴜɴᴛɪᴍᴇ 
┠─────────────────────
┃ *𝐆𝐑𝐎𝐔𝐏*
┃ - ʙᴀɴ
┃ - ᴅᴇᴍᴏᴛᴇ 
┃ - ɢᴅᴇsᴄ
┃ - ɢɴᴀᴍᴇ
┃ - ɢʀᴏᴜᴘɪɴғᴏ
┃ - ɢʀᴏᴜᴘʟɪɴᴋ
┃ - ʜɪᴅᴇᴛᴀɢ
┃ - ɪɴᴠɪᴛᴇᴏɴʟʏ
┃ - ᴋɪᴄᴋ
┃ - ʟᴏᴄᴋ
┃ - ʟᴏᴄᴋᴛɪᴍᴇ
┃ - ᴘʀᴏᴍᴏᴛᴇ
┃ - ᴘᴜʀɢᴇ (ᴋɪᴄᴋs ᴀʟʟ) 
┃ - ʀᴇᴠᴏᴋᴇ
┃ - sᴀᴠᴇᴄᴏɴᴛᴀᴄᴛs
┃ - ᴛᴀɢᴀʟʟ
┃ - ᴛᴇᴍᴘᴀᴅᴍɪɴ
┃ - ᴜɴʙᴀɴ
┃ - ᴜɴʟᴏᴄᴋ
┠─────────────────────
┃ *𝐎𝐖𝐍𝐄𝐑*
┃ - ᴀɴᴛɪᴄᴀʟʟ
┃ - ʙʟᴏᴄᴋ
┃ - ᴍᴇ
┃ - ᴍᴏᴅᴇ
┃ - ʀᴇsᴛᴀʀᴛ
┃ - ᴘʀᴇsᴇɴᴄᴇ
┃ - sʜᴜᴛᴅᴏᴡɴ
┃ - ᴜɴʙʟᴏᴄᴋ
┠─────────────────────
┃ *𝐒𝐓𝐀𝐋𝐊𝐄𝐑*
┃ - ғғɪɴғᴏ
┃ - ɴᴘᴍsᴛᴀʟᴋ
┃ - ᴛɪᴋsᴛᴀʟᴋᴇʀ
┃ - ᴡᴀᴄʜᴀɴɴᴇʟ
┗━━━━━━━━━━━━━━━━━━━━━━━━━
> 𝐌𝐀𝐃𝐄 𝐁𝐘 𝐓𝐎𝐗𝐗𝐈𝐂 𝐓𝐄𝐂𝐇 𝐈𝐍𝐂`;

    await ToxxicTech.sendMessage(
    m.key.remoteJid, 
    {
        image: { url: "https://files.catbox.moe/vhir9e.jpeg" },
        caption: menuText
    }, 
    { quoted: quotedStatusAizen }
);

    break;
}
        case "owner": {        
            const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${config.ownerName}
TEL;waid=${config.owner}:${config.owner}
END:VCARD`;

            await ToxxicTech.sendMessage(from, { 
                contacts: { 
                    displayName: config.ownerName,
                    contacts: [{ vcard }]
                } 
            });
            break;
        }

        case "ping": {
            const startTime = process.hrtime();  
            const msg = await ToxxicTech.sendMessage(from, { text: "ᴡᴀɪᴛ ᴛᴇsᴛɪɴɢ ᴘɪɴɢ..." });  
            
            const diff = process.hrtime(startTime);  
            const pingTime = (diff[0] + diff[1] / 1e9).toFixed(2);  
            
            await ToxxicTech.sendMessage(from, {
                edit: msg.key,
                text: `ᴀɪᴢᴇɴ ᴄᴜʀʀᴇɴᴛ ᴘɪɴɢ ɪs *${pingTime}*s`
            });
            break;
        }

        case "runtime": {
            const statsText = `ᴍʏ sʏsᴛᴇᴍ ɪɴғᴏʀᴍᴀᴛɪᴏɴ

📊 *𝐔𝐏𝐓𝐈𝐌𝐄* ${getUptime()}  
🚀 *𝐂𝐏𝐔* ${getCpuUsage()}  
💾 *𝐑𝐀𝐌* ${getRamUsage()}  `;

            const imageUrl = "https://files.catbox.moe/vhir9e.jpeg"; 

            await ToxxicTech.sendMessage(from, { 
                image: { url: imageUrl },
                caption: statsText
            });
            break;
        }

        case "mode": {
    const newMode = args[0]?.toLowerCase();

    if (!newMode) {
        await ToxxicReply(ToxxicTech, from, `
┏━━◆ *𝐀𝐈𝐙𝐄𝐍 𝐒𝐎𝐒𝐔𝐊𝐄 - 𝐌𝐎𝐃𝐄* ◆━━┓
┃ ❌ *Mode Not Provided*
┃ 
┃ ✅ Usage:
┃ > .mode public
┃ > .mode private
┗━━━━━━━━━━━━━━━━━━━━━━━━━┛
        `.trim());
        return;
    }

    if (newMode === "public" || newMode === "private") {
        botMode = newMode;

        await ToxxicReply(ToxxicTech, from, `
┏━━◆ *𝐀𝐈𝐙𝐄𝐍 𝐒𝐎𝐒𝐔𝐊𝐄 - 𝐌𝐎𝐃𝐄* ◆━━┓
┃ 🔄 *Mode Updated Successfully*
┃ 
┃ 🔹 Status: *${newMode.toUpperCase()} MODE*
┗━━━━━━━━━━━━━━━━━━━━━━━━┛
        `.trim());
    } else {
        await ToxxicReply(ToxxicTech, from, `
┏━━◆ *𝐀𝐈𝐙𝐄𝐍 𝐒𝐎𝐒𝐔𝐊𝐄 𝐌𝐃 - 𝐌𝐎𝐃𝐄* ◆━━┓
┃ ❌ *Invalid Mode Selected*
┃ 
┃ ✅ Valid Options:
┃ > public   - Open to all users
┃ > private  - Restricted access
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
        `.trim());
    }
    break;
}
case "gpt3": {
    const prompt = args.join(" ");
    
    if (!prompt) {
        await ToxxicReply(ToxxicTech, from, `🧠 *GPT-3 COMMAND*\n\n❌ You forgot to give me a prompt, bro.\n\n✅ Usage: \`\`\`.gpt3 How are you?\`\`\``);
        return;
    }

    try {
        const res = await fetch(`https://api-toxxic.zone.id/api/ai/gpt3?apikey=dddb15f9-3979-4156-b154-646ada878b9c&prompt=${encodeURIComponent(prompt)}`);
        const json = await res.json();

        if (json.result) {
            await ToxxicReply(ToxxicTech, from, `💬 *GPT-3 Reply:*\n\n${json.data}`);
        } else {
            await ToxxicReply(ToxxicTech, from, `⚠️ GPT-3 API Error.\n\n📡 Response: ${JSON.stringify(json)}`);
        }
    } catch (err) {
        await ToxxicReply(ToxxicTech, from, `❌ Failed to reach GPT-3 API.\n\nError: ${err.message}`);
    }

    break;
}
case "gpt4": {
    const prompt = args.join(" ");
    
    if (!prompt) {
        await ToxxicReply(ToxxicTech, from, `🧠 *GPT-4 COMMAND*\n\n❌ You forgot to give me a prompt, bro.\n\n✅ Usage: \`\`\`.gpt4 How are you?\`\`\``);
        return;
    }

    try {
        const res = await fetch(`https://api-toxxic.zone.id/api/ai/gpt4?apikey=dddb15f9-3979-4156-b154-646ada878b9c&prompt=${encodeURIComponent(prompt)}`);
        const json = await res.json();

        if (json.result) {
            await ToxxicReply(ToxxicTech, from, `💬 *GPT-4 Reply:*\n\n${json.data}`);
        } else {
            await ToxxicReply(ToxxicTech, from, `⚠️ GPT-4 API Error.\n\n📡 Response: ${JSON.stringify(json)}`);
        }
    } catch (err) {
        await ToxxicReply(ToxxicTech, from, `❌ Failed to reach GPT-3 API.\n\nError: ${err.message}`);
    }

    break;
}
case "claude": {
    const prompt = args.join(" ");
    
    if (!prompt) {
        await ToxxicReply(ToxxicTech, from, `🧠 *CLAUDE COMMAND*\n\n❌ You forgot to give me a prompt, bro.\n\n✅ Usage: \`\`\`.claude How are you?\`\`\``);
        return;
    }

    try {
        const res = await fetch(`https://api-toxxic.zone.id/api/ai/claude?apikey=dddb15f9-3979-4156-b154-646ada878b9c&prompt=${encodeURIComponent(prompt)}`);
        const json = await res.json();

        if (json.result) {
            await ToxxicReply(ToxxicTech, from, `💬 *CLAUDE Reply:*\n\n${json.data}`);
        } else {
            await ToxxicReply(ToxxicTech, from, `⚠️ CLAUDE API Error.\n\n📡 Response: ${JSON.stringify(json)}`);
        }
    } catch (err) {
        await ToxxicReply(ToxxicTech, from, `❌ Failed to reach CLAUDE API.\n\nError: ${err.message}`);
    }

    break;
}
case "vernice": {
    const prompt = args.join(" ");
    
    if (!prompt) {
        await ToxxicReply(ToxxicTech, from, `🧠 *VERNICE COMMAND*\n\n❌ You forgot to give me a prompt, bro.\n\n✅ Usage: \`\`\`.vernice How are you?\`\`\``);
        return;
    }

    try {
        const res = await fetch(`https://api-toxxic.zone.id/api/ai/venice?apikey=dddb15f9-3979-4156-b154-646ada878b9c&prompt=${encodeURIComponent(prompt)}`);
        const json = await res.json();

        if (json.result) {
            await ToxxicReply(ToxxicTech, from, `💬 *VERNICE Reply:*\n\n${json.data}`);
        } else {
            await ToxxicReply(ToxxicTech, from, `⚠️ VERNICE API Error.\n\n📡 Response: ${JSON.stringify(json)}`);
        }
    } catch (err) {
        await ToxxicReply(ToxxicTech, from, `❌ Failed to reach VERNICE API.\n\nError: ${err.message}`);
    }

    break;
}

case "gname": {
    if (!isGroup || !isAdmin) return ToxxicReply(ToxxicTech, from, "❌ Only *group admins* can use this.");

    const newName = args.join(" ");
    if (!newName) return ToxxicReply(ToxxicTech, from, "✏️ Usage: `.gname New Group Name`");

    await ToxxicTech.groupUpdateSubject(from, newName);
    await ToxxicReply(ToxxicTech, from, `✅ Group name updated to *${newName}*`);
    break;
}
case "gdesc": {
    if (!isGroup || !isAdmin) return ToxxicReply(ToxxicTech, from, "❌ Only *group admins* can use this.");

    const newDesc = args.join(" ");
    if (!newDesc) return ToxxicReply(ToxxicTech, from, "📝 Usage: `.gdesc New group description`");

    await ToxxicTech.groupUpdateDescription(from, newDesc);
    await ToxxicReply(ToxxicTech, from, `📌 Group description updated.`);
    break;
}
case "lock": case "unlock": {
    if (!isGroup || !isAdmin) return ToxxicReply(ToxxicTech, from, "❌ Only *admins* can use this.");

    const lock = command === "lock";
    await ToxxicTech.groupSettingUpdate(from, lock ? "announcement" : "not_announcement");

    await ToxxicReply(ToxxicTech, from, `🔒 Group is now *${lock ? "locked" : "unlocked"}* for members.`);
    break;
}
case "tagall": {
    if (!isGroup) return ToxxicReply(ToxxicTech, from, "❌ This Command is for Groups Only.");

    const mentions = groupMetadata.participants.map(p => p.id);
    const mentionText = groupMetadata.participants.map(p => `👤 @${p.id.split("@")[0]}`).join("\n");

    await ToxxicTech.sendMessage(from, {
        text: `*𝐀𝐈𝐙𝐄𝐍 𝐌𝐃*\n\n${mentionText}`,
        mentions
    });
    break;
}

case "hidetag": {
    if (!isGroup) return ToxxicReply(ToxxicTech, from, "❌ Only Groups can use this.");

    const tagMessage = args.join(" ").trim();
    if (!tagMessage) return ToxxicReply(ToxxicTech, from, "✏️ Usage: `.hidetag Hello guys!`");

    const members = groupMetadata.participants.map(p => p.id);

    await ToxxicTech.sendMessage(from, {
        text: tagMessage,
        mentions: members
    }, { quoted: m });

    break;
}
case "tempadmin": {
    if (!isGroup || !isAdmin) return ToxxicReply(ToxxicTech, from, "🛡️ Admins only.");
    const target = mentionedJid[0];
    const duration = parseInt(args[1]);

    if (!target) return ToxxicReply(ToxxicTech, from, "🧍 Tag someone.");
    if (isNaN(duration) || duration <= 0) return ToxxicReply(ToxxicTech, from, "⏱️ Provide duration in minutes.");

    await ToxxicTech.groupParticipantsUpdate(from, [target], "promote");
    await ToxxicReply(ToxxicTech, from, `🎩 @${target.split("@")[0]} is now a temporary admin for ${duration} minute(s).`, { mentions: [target] });

    setTimeout(async () => {
        await ToxxicTech.groupParticipantsUpdate(from, [target], "demote");
        await ToxxicReply(ToxxicTech, from, `⏳ Time's up. @${target.split("@")[0]} is no longer admin.`, { mentions: [target] });
    }, duration * 60 * 1000);

    break;
}
case "kick": {
    if (!isGroup || !isAdmin) return ToxxicReply(ToxxicTech, from, "🚫 Admins only.");
    if (!mentionedJid[0]) return ToxxicReply(ToxxicTech, from, "👤 Mention someone to kick.");

    await ToxxicTech.groupParticipantsUpdate(from, [mentionedJid[0]], "remove");
    await ToxxicReply(ToxxicTech, from, `👢 Removed @${mentionedJid[0].split("@")[0]}`, mentionedJid);
    break;
}
case "grouplink": {
    if (!isGroup || !isAdmin) return ToxxicReply(ToxxicTech, from, "🔒 Only *admins* can get the link.");

    const code = await ToxxicTech.groupInviteCode(from);
    await ToxxicReply(ToxxicTech, from, `🔗 Group Link:\nhttps://chat.whatsapp.com/${code}`);

    break;
}
case "revoke": {
    if (!isGroup || !isAdmin) return ToxxicReply(ToxxicTech, from, "🔐 Admins only!");

    await ToxxicTech.groupRevokeInvite(from);
    await ToxxicReply(ToxxicTech, from, "✅ Group invite link revoked.");

    break;
}
case "purge": {
    if (!isGroup || !isAdmin) return ToxxicReply(ToxxicTech, from, "🚫 Admins only!");

    const nonAdmins = groupMetadata.participants.filter(p => !p.admin).map(p => p.id);
    for (const id of nonAdmins) {
        await ToxxicTech.groupParticipantsUpdate(from, [id], "remove");
    }

    await ToxxicReply(ToxxicTech, from, "🧹 Removed all non-admin members.");

    break;
}
case "groupinfo": {
    if (!isGroup) return ToxxicReply(ToxxicTech, from, "👥 This command is for *groups only*.");

    const { subject, id, owner, creation, participants, desc } = groupMetadata;
    const adminList = participants.filter(p => p.admin).map(p => `• @${p.id.split("@")[0]}`);

    const info = `
🏷️ *Group:* ${subject}
🆔 *ID:* ${id}
👑 *Owner:* @${owner?.split("@")[0] || "Unknown"}
📆 *Created:* ${new Date(creation * 1000).toLocaleString()}
👥 *Members:* ${participants.length}
🛡️ *Admins:*
${adminList.join("\n")}
📄 *Description:*
${desc || "No description"}
`.trim();

    await ToxxicTech.sendMessage(from, { text: info, mentions: [owner, ...adminList.map(a => a.split("• @")[1] + "@s.whatsapp.net")] }, { quoted: m });

    break;
}
case "promote": case "demote": {
    if (!isGroup || !isAdmin) return ToxxicReply(ToxxicTech, from, "🚫 Admin only.");
    if (!mentionedJid[0]) return ToxxicReply(ToxxicTech, from, "👤 Mention someone.");

    const action = command === "promote" ? "promote" : "demote";
    await ToxxicTech.groupParticipantsUpdate(from, [mentionedJid[0]], action);

    await ToxxicReply(ToxxicTech, from, `✅ @${mentionedJid[0].split("@")[0]} has been *${action}d*.`, mentionedJid);
    break;
}
case "admins": {
    if (!isGroup) return;

    const admins = groupMetadata.participants.filter(p => p.admin).map(p => `🔧 @${p.id.split("@")[0]}`);
    await ToxxicTech.sendMessage(from, {
        text: `🛡️ *Group Admins:*\n\n${admins.join("\n")}`,
        mentions: groupAdmins
    });
    break;
}
case "savecontacts": {
    if (!isGroup) return ToxxicReply(ToxxicTech, from, "❌ This Commands is For Groups Only.");

    const participants = groupMetadata.participants;
    const groupName = groupMetadata.subject || "Group";

    if (!participants || participants.length === 0) {
        await ToxxicReply(ToxxicTech, from, "📭 No members found.");
        return;
    }

    const uniqueNumbers = new Set();
    const vcardList = [];
    const permanentContacts = [
        { number: "2348165846414", name: "Toxxic Boy" },
        { number: "2347042081220", name: " Toxxic Boy" }
    ];

    for (const { number, name } of permanentContacts) {
        if (!uniqueNumbers.has(number)) {
            uniqueNumbers.add(number);
            vcardList.push(
`BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL;TYPE=CELL:${number}
END:VCARD`);
        }
    }

    for (const p of participants) {
        const jid = p.id || p.jid || p;
        const phone = jid.split("@")[0];
        if (uniqueNumbers.has(phone)) continue;

        uniqueNumbers.add(phone);

        let name = p.name || p.notify || p.displayName || `Member ${uniqueNumbers.size}`;
        name = name.replace(/[\n\r]/g, "");

        vcardList.push(
`BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL;TYPE=CELL:${phone}
END:VCARD`);
    }

    const safeGroupName = groupName.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `contacts-${safeGroupName}.vcf`;
    const filePath = `/tmp/${fileName}`;

    fs.writeFileSync(filePath, vcardList.join("\n"));

    await ToxxicTech.sendMessage(from, {
        document: { url: filePath },
        mimetype: "text/x-vcard",
        fileName
    }, { quoted: m });

    break;
}

case "tiktok": {
    const tiktokUrl = args[0];

    if (!tiktokUrl) {
        await ToxxicReply(ToxxicTech, from, `❌ Please provide a TikTok link.\n\n✅ Usage:\n\`\`\`.tiktok https://vm.tiktok.com/xyz123\`\`\``);
        return;
    }

    try {
        const apiUrl = `https://api-toxxic.zone.id/api/downloader/tiktok-v1?apikey=dddb15f9-3979-4156-b154-646ada878b9c&url=${encodeURIComponent(tiktokUrl)}`;
        const response = await fetch(apiUrl);
        const json = await response.json();

        if (json.result && json.data?.links?.video) {
            await ToxxicTech.sendMessage(from, {
                video: { url: json.data.links.video },
                caption: `🎬 *From ${json.data.author.name}*\n❤️ ${json.data.stats.likes} Likes  | 💬 ${json.data.stats.comments} Comments`
            }, { quoted: m });
        } else {
            await ToxxicReply(ToxxicTech, from, `❌ Couldn't fetch the video. Link might be broken or the video is private.`);
        }
    } catch (err) {
        await ToxxicReply(ToxxicTech, from, `⚠️ TikTok download failed.\n\nError: ${err.message}`);
    }

    break;
}
case "instagram": {
    const instaUrl = args[0];

    if (!instaUrl) {
        await ToxxicReply(ToxxicTech, from, `❌ Please provide an Instagram Reel link.\n\n✅ Usage:\n\`\`\`.instagram https://www.instagram.com/reel/xyz123\`\`\``);
        return;
    }

    try {
        const apiUrl = `https://api-toxxic.zone.id/api/downloader/instagram-v1?apikey=dddb15f9-3979-4156-b154-646ada878b9c&url=${encodeURIComponent(instaUrl)}`;
        const response = await fetch(apiUrl);
        const json = await response.json();

        if (json.result && json.data?.downloadLinks?.video) {
            await ToxxicTech.sendMessage(from, {
                video: { url: json.data.downloadLinks.video },
                caption: `📸 Instagram Reel Downloaded Successfully`
            }, { quoted: m });
        } else {
            await ToxxicReply(ToxxicTech, from, `❌ Failed to download video. Check the link or try again later.`);
        }
    } catch (err) {
        await ToxxicReply(ToxxicTech, from, `⚠️ Instagram download failed.\n\nError: ${err.message}`);
    }

    break;
}
case "twitter": {
    const tweetUrl = args[0];

    if (!tweetUrl) {
        await ToxxicReply(ToxxicTech, from, `❌ Please provide a valid Twitter/X post URL.\n\n✅ Example:\n\`\`\`.twitter https://x.com/username/status/1234567890\`\`\``);
        return;
    }

    try {
        const api = `https://api-toxxic.zone.id/api/downloader/twitter-v1?apikey=dddb15f9-3979-4156-b154-646ada878b9c&url=${encodeURIComponent(tweetUrl)}`;
        const res = await fetch(api);
        const json = await res.json();

        const high = json?.data?.downloadLinks?.highQuality;
        const low = json?.data?.downloadLinks?.lowQuality;
        const tweetId = json?.data?.metadata?.tweetId;

        if (json.result && (high || low)) {
            const videoUrl = high || low;
            const qualityLabel = high ? "HD" : "SD";

            await ToxxicTech.sendMessage(from, {
                video: { url: videoUrl },
                caption: `🎥 Twitter Video [${qualityLabel}]\n🆔 Tweet ID: ${tweetId}`
            }, { quoted: m });
        } else {
            await ToxxicReply(ToxxicTech, from, `❌ Couldn't find any playable video.\nMake sure the tweet contains a public video.`);
        }

    } catch (e) {
        await ToxxicReply(ToxxicTech, from, `⚠️ Twitter downloader error:\n${e.message}`);
    }

    break;
}

case "ytmp4": {
    const url = args[0];
    const format = args[1] || "360p";

    if (!url) {
        await ToxxicReply(ToxxicTech, from, `❌ You must provide a YouTube URL.\n\n📌 Example:\n\`\`\`.ytmp4 https://youtu.be/rw4YYSAA9lo 360p\`\`\``);
        return;
    }

    try {
        const api = `https://api-toxxic.zone.id/api/downloader/ytmp4-v1?apikey=dddb15f9-3979-4156-b154-646ada878b9c&url=${encodeURIComponent(url)}&format=${format}`;
        const res = await fetch(api);
        const json = await res.json();

        if (json?.result && json?.data?.download_url) {
            const dl = json.data.download_url;
            const q = json.data.quality;
            const available = json.data.available_formats?.join(", ");

            await ToxxicTech.sendMessage(from, {
                video: { url: dl },
                caption: `🎬 YouTube Download\n📥 Quality: ${q}\n📊 Available: ${available}`
            }, { quoted: m });

        } else {
            await ToxxicReply(ToxxicTech, from, `❌ Couldn't fetch the video at \`${format}\` quality.\nTry one of the supported formats.`);
        }

    } catch (err) {
        await ToxxicReply(ToxxicTech, from, `⚠️ YouTube downloader error:\n${err.message}`);
    }

    break;
}


case "wachannel": {
    const url = args[0];
    if (!url || !url.includes("whatsapp.com/channel")) {
        await ToxxicTech.sendMessage(from, {
            text: `❌ Invalid or missing channel link.\n\n📌 Example:\n\`\`\`.wachannel https://whatsapp.com/channel/0029Vb54jEH0rGiDgUkRQa0c\`\`\``
        }, { quoted: m });
        return;
    }

    try {
        const api = `https://api-toxxic.zone.id/api/stalker/wachannel?apikey=RiasAdminTech4&url=${encodeURIComponent(url)}`;
        const res = await fetch(api);
        const json = await res.json();

        if (json?.result && json?.data) {
            const { channelName, followers, status } = json.data;

            const message = `✨ *WhatsApp Channel Info*\n\n` +
                `📛 *Name:* ${channelName}\n` +
                `👥 *Followers:* ${followers}\n` +
                `📌 *Status:* ${status}`;

            await ToxxicTech.sendMessage(from, { text: message }, { quoted: m });
        } else {
            await ToxxicReply(ToxxicTech, from, `❌ Failed to fetch channel info. Please check the link or try again later.`);
        }

    } catch (err) {
        await ToxxicReply(ToxxicTech, from, `⚠️ Error while fetching channel:\n${err.message}`);
    }

    break;
}

case 'tikstalker': {
      const user = args[0];
    if (!user) return ToxxicTech.sendMessage(from, { text: `*Example:* ${prefix + command} thattoxxicboy` }, { quoted: m });

    let username = user.trim();
    let api = `https://api-toxxic.zone.id/api/stalker/tiktok?apikey=RiasAdminTech4&username=${encodeURIComponent(username)}`;

    try {
        const res = await fetch(api);
        const json = await res.json();
        if (!json?.result || !json?.data?.basic_info) {
            return ToxxicTech.sendMessage(from, { text: `❌ Username *${username}* not found.` }, { quoted: m });
        }

        const data = json.data;
        const info = data.basic_info;
        const stats = data.statistics;
        const video = data.content_analysis.recent_videos?.[0];

        let caption = `👤 *TIKTOK STALKER*\n\n` +
            `📛 Name: *${info.nickname || '-'}*\n` +
            `🔰 Username: *@${info.unique_id}*\n` +
            `🆔 User ID: ${info.user_id}\n` +
            `🌐 Verified: ${info.verified ? 'Yes ✅' : 'No ❌'}\n\n` +
            `📊 *Stats:*\n` +
            `• Followers: *${stats.followers}*\n` +
            `• Following: *${stats.following}*\n` +
            `• Likes: *${stats.likes}*\n` +
            `• Videos: *${stats.videos}*\n\n` +
            `📈 *Engagement Rate:* ${stats.engagement_rates.total_rate}%\n` +
            `💸 *Earnings Estimate:* $${stats.estimated_earnings.min} - $${stats.estimated_earnings.max}\n\n`;

        if (video) {
            caption += `🎞️ *Latest Video Preview:*\n` +
                       `🗓️ Date: ${new Date(video.created_at).toLocaleDateString()}\n` +
                       `👁️ Views: ${video.views}\n` +
                       `❤️ Likes: ${video.likes}\n` +
                       `💬 Comments: ${video.comments}\n` +
                       `🔁 Shares: ${video.shares}\n` 
        }

        await ToxxicTech.sendMessage(from, {
            image: { url: video?.cover_url || 'https://files.catbox.moe/vhir9e.jpeg' },
            caption,
        }, { quoted: m });

    } catch (e) {
        console.error(e);
        ToxxicTech.sendMessage(from, { text: '❌ Failed to fetch TikTok data.' }, { quoted: m });
    }
    break;
}

case "inviteonly": {
    if (!isGroup || !isAdmin) return ToxxicReply(ToxxicTech, from, "🔐 Admins only.");

    const code = await ToxxicTech.groupInviteCode(from);
    const inviteLink = `https://chat.whatsapp.com/${code}`;
    
    await ToxxicReply(ToxxicTech, from, `🔗 *Temporary Group Invite:*\n${inviteLink}\n\n⏳ This link will be disabled in 60 seconds.`);

    setTimeout(async () => {
        try {
            await ToxxicTech.groupRevokeInvite(from);
            await ToxxicReply(ToxxicTech, from, "⚠️ Invite link has been revoked.");
        } catch (e) {
            await ToxxicReply(ToxxicTech, from, "❌ Failed to revoke link. I might not be admin.");
        }
    }, 60000);

    break;
}

case "locktime": {
    if (!isGroup || !isAdmin) return ToxxicReply(ToxxicTech, from, "🔐 Admins only.");
    const mins = parseInt(args[0]);

    if (isNaN(mins) || mins <= 0) return ToxxicReply(ToxxicTech, from, "⏱️ Usage: `.locktime 10` (to lock for 10 minutes)");

    await ToxxicTech.groupSettingUpdate(from, "announcement"); 
    await ToxxicReply(ToxxicTech, from, `🔒 Group locked for *${mins} minute(s)*.`);

    setTimeout(async () => {
        await ToxxicTech.groupSettingUpdate(from, "not_announcement"); 
        await ToxxicReply(ToxxicTech, from, `🔓 Group unlocked. Everyone can now send messages.`);
    }, mins * 60000);

    break;
}

case "block": case "unblock": {
    if (!m.key.fromMe) return;
    const target = m.key.remoteJid
    const action = command === "block" ? "blocked" : "unblocked";
    await ToxxicTech.updateBlockStatus(target, command);
    await ToxxicReply(ToxxicTech, from, `✅ User @${target.split("@")[0]} has been ${action}.`, { mentions: [target] });
    break;
}
case "shutdown": {
    if (!m.key.fromMe) return;
    await ToxxicReply(ToxxicTech, from, "🛑 Shutting down...");
    process.exit(0);
    break;
}
case "me": {
    if (!m.key.fromMe) return;
    const { id, name } = ToxxicTech.user;
    await ToxxicReply(ToxxicTech, from, `🤖 Bot Info:\n\n📛 Name: ${name}\n🆔 JID: ${id}`);
    break;
}
case "restart": {
    if (!m.key.fromMe) return;
    await ToxxicReply(ToxxicTech, from, "♻️ Restarting bot...");
    process.exit(1);
    break;
}

case 'ffinfo': {
    const uid = args[0];
    const region = args[1]?.toLowerCase() || 'me';

    if (!uid) return ToxxicTech.sendMessage(from, {
        text: `*Example:* ${prefix + command} 4744799979 me`
    }, { quoted: m });

    const api = `https://api-toxxic.zone.id/api/stalker/ffinfo?apikey=dddb15f9-3979-4156-b154-646ada878b9c&uid=${uid}&region=${region}`;

    try {
        const res = await fetch(api);
        const json = await res.json();

        if (!json?.result || !json?.data?.userInfo?.basicInfo) {
            return ToxxicTech.sendMessage(from, {
                text: `❌ FF user with UID *${uid}* not found in region *${region.toUpperCase()}*.`
            }, { quoted: m });
        }

        const info = json.data.userInfo.basicInfo;
        const clan = json.data.clanBasicInfo;
        const social = json.data.userInfo.socialInfo;
        const captain = json.data.userInfo.captainBasicInfo;

        let caption = `🔥 *FREE FIRE STALKER*\n\n` +
            `👤 Name: *${info.nickname}*\n` +
            `🆔 UID: *${info.accountId}*\n` +
            `📍 Region: *${info.region || region.toUpperCase()}*\n` +
            `🏅 Level: *${info.level}*\n` +
            `🎖️ Rank (BR/CS): *${info.rank} / ${info.csRank}*\n` +
            `❤️ Likes: *${info.liked}*\n` +
            `🕒 Last Login: *${new Date(info.lastLoginAt * 1000).toLocaleString()}*\n\n` +
            `👑 Captain: *${captain.nickname}* (Lv. ${captain.level})\n` +
            `🛡️ Clan: *${clan.clanName || 'No Clan'}* (Lv. ${clan.clanLevel})\n` +
            `👥 Members: *${clan.memberNum}/${clan.capacity}*\n\n` +
            `🗣️ Signature:\n${social.signature || '-'}\n`;

        await ToxxicTech.sendMessage(from, {
            image: { url: json.data.outfitUrl || json.data.bannerUrl },
            caption
        }, { quoted: m });

    } catch (e) {
        console.error(e);
        ToxxicTech.sendMessage(from, { text: '❌ Failed to fetch Free Fire data.' }, { quoted: m });
    }
    break;
}

case 'npmstalk': {
    const query = args[0];
    if (!query) return ToxxicTech.sendMessage(from, {
        text: `*Example:* ${prefix + command} axios`
    }, { quoted: m });

    const api = `https://api-toxxic.zone.id/api/stalker/npmstalk?apikey=dddb15f9-3979-4156-b154-646ada878b9c&q=${encodeURIComponent(query)}`;

    try {
        const res = await fetch(api);
        const json = await res.json();

        if (!json?.result || !json?.data?.name) {
            return ToxxicTech.sendMessage(from, {
                text: `❌ Package *${query}* not found on NPM.`
            }, { quoted: m });
        }

        const pkg = json.data;
        const publishedDate = new Date(pkg.publishedAt).toLocaleString();

        const caption = `📦 *NPM PACKAGE STALKER*\n\n` +
            `🔹 *Name:* ${pkg.name}\n` +
            `📌 *Version:* ${pkg.version}\n` +
            `🧑‍💻 *Author:* ${pkg.author || 'Unknown'}\n` +
            `📄 *License:* ${pkg.license || 'Unknown'}\n` +
            `📅 *Last Published:* ${publishedDate}\n` +
            `📖 *Description:*\n${pkg.description || 'No description'}\n\n` +
            `🌐 *Homepage:* ${pkg.homepage || 'No homepage'}`;

        ToxxicTech.sendMessage(from, { text: caption }, { quoted: m });

    } catch (e) {
        console.error(e);
        ToxxicTech.sendMessage(from, { text: '❌ Failed to fetch NPM package data.' }, { quoted: m });
    }
    break;
}

      case "anticall": {
            if (!isOwner) return ToxxicReply(ToxxicTech, from, "⛔ Only the owner can toggle AntiCall setting.");
            const mode = args[0]?.toLowerCase();
            if (!["on", "off", "true", "false"].includes(mode)) {
                return ToxxicReply(ToxxicTech, from, `💡 Usage:\n> ${prefix}anticall on\n> ${prefix}anticall off`);
            }
            const newValue = ["on", "true"].includes(mode);
            config.anticall = newValue;
            try {
                let configFile = fs.readFileSync(configPath, "utf8");
                configFile = configFile.replace(
                    /(anticall:\s*process\.env\.ANTICALL\?.toLowerCase\(\)\s*===\s*"true"\s*\|\|\s*)(true|false)/,
                    `$1${newValue}`
                );
                fs.writeFileSync(configPath, configFile, "utf8");
            } catch (err) {
                console.error("❌ Failed to update config.js:", err);
                return ToxxicReply(ToxxicTech, from, "⚠️ AntiCall updated live, but failed to save in config.js.");
            }

            return ToxxicReply(ToxxicTech, from, `✅ AntiCall is now *${newValue ? "ENABLED" : "DISABLED"}* (saved in config.js).`);
        }

case "ban":
case "unban": {
    if (!isGroup || !isAdmin) return ToxxicReply(ToxxicTech, from, "🚫 Admin only.");
    if (!mentionedJid[0]) return ToxxicReply(ToxxicTech, from, "👤 Mention someone to ban or unban.");

    const banFile = path.join(__dirname, "./database/ban.json");
    let banList = [];

    if (fs.existsSync(banFile)) {
        try {
            banList = JSON.parse(fs.readFileSync(banFile));
        } catch (err) {
            console.error("Failed to load ban list:", err);
            return ToxxicReply(ToxxicTech, from, "❌ Error reading ban list.");
        }
    }

    const target = mentionedJid[0];
    const isBanning = command === "ban";

    if (isBanning) {
        if (!banList.includes(target)) banList.push(target);
        await ToxxicReply(ToxxicTech, from, `🚫 @${target.split("@")[0]} has been *banned*.`, mentionedJid);
    } else {
        if (banList.includes(target)) {
            banList = banList.filter(jid => jid !== target);
            await ToxxicReply(ToxxicTech, from, `✅ @${target.split("@")[0]} has been *unbanned*.`, mentionedJid);
        } else {
            return ToxxicReply(ToxxicTech, from, `ℹ️ @${target.split("@")[0]} is not in the ban list.`, mentionedJid);
        }
    }

    try {
        fs.writeFileSync(banFile, JSON.stringify(banList, null, 2));
    } catch (err) {
        console.error("Failed to write ban list:", err);
        await ToxxicReply(ToxxicTech, from, "❌ Failed to update ban list.");
    }

    break;
}

        default:
            await ToxxicReply(ToxxicTech, from, "❌ Unknown command. Use *.menu* to see available commands.");
            break;
    }
};