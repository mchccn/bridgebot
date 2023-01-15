import { Client, Message, MessageMentions, TextChannel } from "discord.js";
import "dotenv/config";
import i from "imgur";
import { createBot } from "mineflayer";
import { Stream } from "stream";

const client = new Client({
    intents: ["MessageContent", "GuildMessages", "GuildMembers"],
});

await client.login(process.env.TOKEN!);

const guild = await client.guilds.fetch(process.env.GUILD_ID!);

await guild.members.fetch();

const channel = (await guild.channels.fetch(
    process.env.CHANNEL_ID!
)) as TextChannel;

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

    bot.chat("/chat g");
});

const CHAT_REGEX = /^Guild > (\[.*]\s*)?([\w]{2,17}).*?(\[.{1,15}])?: (.*)$/;
const GUILD_UPDATE = /^Guild > ([\w]{2,17}) (left|joined)\.$/;
const MENTION_REGEX = /@([\S]+)/g;

function discordMessageAsPlainText(message: Message) {
    const raw = message.content;

    let formatted = raw
        .replace(
            new RegExp(MessageMentions.UsersPattern.source, "g"),
            (_, id) => {
                const user = client.users.cache.get(id);

                if (user) return `@${user.username}#${user.discriminator}`;

                return "@[unknown]";
            }
        )
        .replace(
            new RegExp(MessageMentions.ChannelsPattern.source, "g"),
            (_, id) => {
                const channel = client.channels.cache.get(id);

                if (channel)
                    return "name" in channel
                        ? `#${channel.name ?? "[unknown]"}`
                        : "#[unknown]";

                return "#[unknown]";
            }
        )
        .replace(new RegExp(MessageMentions.RolesPattern, "g"), (_, id) => {
            const role = guild.roles.cache.get(id);

            if (role) return `@${role.name}`;

            return "@[unknown]";
        });

    const prefix = `${message.author.username}#${message.author.discriminator} `;

    const pointer = "> ";

    if (formatted.length <= 100 - prefix.length - pointer.length)
        return [prefix + pointer + formatted];

    const count = Math.ceil(formatted.length / 100);

    const chunks = [];

    while (formatted) {
        const header: string = `(${chunks.length + 1}/${count}) ${pointer}`;

        const chunk = formatted.slice(0, 100 - prefix.length - header.length);

        chunks.push(prefix + header + chunk);

        formatted = formatted.slice(100);
    }

    return chunks;
}

function plainTextToDiscord(message: string) {
    return message.replace(MENTION_REGEX, (_, username) => {
        const user = client.users.cache.find(
            (user) =>
                user.username
                    .toLowerCase()
                    .localeCompare(username.toLowerCase()) === 0
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
            await channel.send(
                `**${rank}${name}**: ${plainTextToDiscord(chat)}`
            );

            // const wh = await channel.createWebhook({
            //     name,
            //     avatar: `https://mc-heads.net/head/${name}`,
            // });

            // await wh.send(chat);

            // await wh.delete();
        }
    }
});

//@ts-ignore
const imgur = new i.ImgurClient({ clientId: process.env.IMGUR_ID! }) as i;

client.on("messageCreate", async (message) => {
    if (
        message.author.bot ||
        message.author.id === client.user!.id ||
        message.channel.id !== process.env.CHANNEL_ID!
    )
        return;

    if (message.attachments.size) {
        const links = await Promise.all(
            message.attachments.map((a) => {
                if (a.attachment instanceof Stream) return undefined;

                return imgur
                    .upload({ image: a.attachment })
                    .then((r) => r.data.link);
            })
        );

        message.content +=
            (message.content ? " " : "") + links.filter(Boolean).join(" ");
    }

    const chunks = discordMessageAsPlainText(message);

    for (const chunk of chunks) {
        bot.chat(chunk);

        if (chunks.length > 1)
            await new Promise((resolve) =>
                setTimeout(resolve, Math.floor(Math.random() * 50) + 200)
            );
    }
});
