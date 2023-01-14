import { Client, TextChannel } from "discord.js";
import "dotenv/config";
import { createBot } from "mineflayer";

const client = new Client({ intents: ["MessageContent", "GuildMessages"] });

await client.login(process.env.TOKEN!);

const guild = await client.guilds.fetch(process.env.GUILD_ID!);

const channel = (await guild.channels.fetch(process.env.CHANNEL_ID!)) as TextChannel;

await channel.send("Starting bridge...");

const bot = createBot({
    host: "mc.hypixel.net",
    version: "1.8.9",
    auth: "microsoft",
    username: process.env.USERNAME!,
    password: process.env.PASSWORD!,
    defaultChatPatterns: false,
    checkTimeoutInterval: 30000,
});

bot.on("spawn", async () => {
    await bot.waitForChunksToLoad();

    await bot.waitForTicks(12);

    await channel.send("Connected to Hypixel!");
});

const regex = /^Guild > (\[.*]\s*)?([\w]{2,17}).*?(\[.{1,15}])?: (.*)$/;

bot.on("message", async (message) => {
    if (message.extra?.length === 100) return;

    const raw = message.toString();

    if (raw === "Woah there, slow down!") await bot.waitForTicks(200);

    const [, rank, name, , chat] = Array.from(raw.match(regex) ?? []);

    if (!rank || !name || !chat || name === process.env.USERNAME!) return;

    const wh = await channel.createWebhook({
        name,
        avatar: `https://mc-heads.net/head/${name}`,
    });

    await wh.send(chat);

    await wh.delete();
});

client.on("messageCreate", async (message) => {
    if (message.author.bot || message.author.id === client.user!.id || message.channel.id !== process.env.CHANNEL_ID!)
        return;

    const raw = message.content;

    bot.chat(`/gc ${message.author.username}#${message.author.discriminator} > ${raw}`);
});
