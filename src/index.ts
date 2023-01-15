import { Client, Message, MessageMentions, TextChannel } from "discord.js";
import "dotenv/config";
import { createBot } from "mineflayer";

const client = new Client({ intents: ["MessageContent", "GuildMessages"] });

await client.login(process.env.TOKEN!);

const guild = await client.guilds.fetch(process.env.GUILD_ID!);

await guild.fetch();
await guild.channels.fetch();
await guild.members.fetch();

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

const CHAT_REGEX = /^Guild > (\[.*]\s*)?([\w]{2,17}).*?(\[.{1,15}])?: (.*)$/;
const GUILD_UPDATE = /^Guild > ([\w]{2,17}) (left|joined)\.$/;
const MENTION_REGEX = /@([\S]+)/;

function discordMessageAsPlainText(message: Message) {
    const raw = message.content;

    return raw
        .replaceAll(MessageMentions.UsersPattern, (_, id) => {
            const user = client.users.cache.get(id);

            if (user) return `@${user.username}#${user.discriminator}`;

            return "@[unknown]";
        })
        .replaceAll(MessageMentions.ChannelsPattern, (_, id) => {
            const channel = client.channels.cache.get(id);

            if (channel) return "name" in channel ? `#${channel.name ?? "[unknown]"}` : "#[unknown]";

            return "#[unknown]";
        })
        .replaceAll(MessageMentions.RolesPattern, (_, id) => {
            const role = guild.roles.cache.get(id);

            if (role) return `@${role.name}`;

            return "@[unknown]";
        });
}

function plainTextToDiscord(message: string) {
    return message.replace(MENTION_REGEX, (_, username) => {
        const user = client.users.cache.find(
            (user) => user.username.toLowerCase().localeCompare(username.toLowerCase()) === 0
        );

        if (user) return `<@${user.id}>`;

        return _;
    });
}

bot.on("message", async (message) => {
    if (message.extra?.length === 100) return;

    const raw = message.toString();

    if (raw === "Woah there, slow down!") await bot.waitForTicks(200);

    {
        const [, name, lj] = Array.from(raw.match(GUILD_UPDATE) ?? []);

        if (name && lj) {
            await channel.send(`**${name}** ${lj}.`);
        }
    }

    {
        const [, rank, name, , chat] = Array.from(raw.match(CHAT_REGEX) ?? []);

        if (rank && name && chat && name !== process.env.USERNAME!) {
            await channel.send(`**${rank}${name}**: ${plainTextToDiscord(chat)}`);

            // const wh = await channel.createWebhook({
            //     name,
            //     avatar: `https://mc-heads.net/head/${name}`,
            // });

            // await wh.send(chat);

            // await wh.delete();
        }
    }
});

client.on("messageCreate", async (message) => {
    if (message.author.bot || message.author.id === client.user!.id || message.channel.id !== process.env.CHANNEL_ID!)
        return;

    bot.chat(`/gc ${message.author.username}#${message.author.discriminator} > ${discordMessageAsPlainText(message)}`);
});
