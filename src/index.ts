import {
    Client,
    Collection,
    Message,
    MessageMentions,
    TextChannel,
} from "discord.js";
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

const escapeMarkdown = (text: string) =>
    text.replace(/\\(\*|_|`|~|\\)/g, "$1").replace(/(\*|_|`|~|\\)/g, "\\$1");

function plainTextToDiscord(message: string) {
    return escapeMarkdown(
        message.replace(MENTION_REGEX, (_, username) => {
            const user = client.users.cache.find(
                (user) =>
                    user.username
                        .toLowerCase()
                        .localeCompare(username.toLowerCase()) === 0
            );

            if (user) return `<@${user.id}>`;

            return _;
        })
    );
}

const CHAT_REGEX = /^Guild > (\[.*]\s*)?([\w]{2,17}).*?(\[.{1,15}])?: (.*)$/;
const GUILD_UPDATE = /^Guild > ([\w]{2,17}).*? (joined|left)\.$/;
const ROLE_UPDATE =
    /^(\[.*]\s*)?([\w]{2,17}).*? was (promoted|demoted) from (.*) to (.*)$/;
const MEMBER_JOIN = /^(\[.*]\s*)?([\w]{2,17}).*? joined the guild!$/;
const MEMBER_LEAVE = /^(\[.*]\s*)?(\w{2,17}).*? left the guild!$/;
const MEMBER_KICKED =
    /^(\[.*]\s*)?(\w{2,17}).*? was kicked from the guild by (\[.*]\s*)?(\w{2,17}).*?!$/;
const LEVEL_UP = /^\s{19}The Guild has reached Level (\d*)!$/;
const QUEST_COMPLETE = /^\s{17}GUILD QUEST COMPLETED!$/;
const TIER_COMPLETE = /^\s{17}GUILD QUEST TIER (\d*) COMPLETED!$/;
const MENTION_REGEX = /@(\S+)/g;
const OWNER_DM = new RegExp(
    String.raw`^From (?:\[.*]\s*)?${process.env.DEVELOPER_IGN}:(.*)$`
);

const SEPARATOR = "-----------------------------------------------------";

bot.on("message", async (message) => {
    if (message.extra?.length === 100) return;

    const raw = message.toString();

    if (raw === "Woah there, slow down!") await bot.waitForTicks(200);

    console.log(raw);

    notifications.forEach((exec, condition) => {
        if (condition(raw)) {
            exec();

            notifications.delete(condition);
        }
    });

    {
        const [, dm] = Array.from(raw.match(OWNER_DM) ?? []);

        if (dm) {
            const [command, ...args] = dm.trim().split(/\s+/);

            if (command === "say") {
                bot.chat(args.join(" "));
            }
        }
    }

    {
        const [, level] = Array.from(raw.match(LEVEL_UP) ?? []);

        if (level) {
            await channel.send(`**The guild has reached level ${level}!**`);
        }
    }

    {
        if (QUEST_COMPLETE.test(raw)) {
            await channel.send(`**Guild quest completed!**`);
        }
    }

    {
        const [, tier] = Array.from(raw.match(TIER_COMPLETE) ?? []);

        if (tier) {
            await channel.send(`**Guild quest tier ${tier} completed!**`);
        }
    }

    {
        const [, rank = "", name] = Array.from(raw.match(MEMBER_JOIN) ?? []);

        if (typeof rank === "string" && name) {
            await channel.send(
                `**${rank}${escapeMarkdown(name)}** has joined the guild!`
            );
        }
    }

    {
        const [, rank = "", name] = Array.from(raw.match(MEMBER_LEAVE) ?? []);

        if (typeof rank === "string" && name) {
            await channel.send(
                `**${rank}${escapeMarkdown(name)}** has left the guild!`
            );
        }
    }

    {
        const [, victimrank = "", victimname, kickerrank, kickername] =
            Array.from(raw.match(MEMBER_KICKED) ?? []);

        if (
            typeof victimrank === "string" &&
            victimname &&
            typeof kickerrank === "string" &&
            kickername
        ) {
            await channel.send(
                `**${victimrank}${escapeMarkdown(
                    victimname
                )}** was kicked from the guild by **${kickerrank}${escapeMarkdown(
                    kickername
                )}**!`
            );
        }
    }

    {
        const [, rank = "", name, pd, from, to] = Array.from(
            raw.match(ROLE_UPDATE) ?? []
        );

        if (typeof rank === "string" && name && pd && from && to) {
            await channel.send(
                `**${rank}${escapeMarkdown(
                    name
                )}** was ${pd} from *${from}* to *${to}*.`
            );
        }
    }

    {
        const [, name, lj] = Array.from(raw.match(GUILD_UPDATE) ?? []);

        if (name && lj) {
            await channel.send(`**${escapeMarkdown(name)}** ${lj}.`);
        }
    }

    {
        const [, rank = "", name, , chat] = Array.from(
            raw.match(CHAT_REGEX) ?? []
        );

        if (
            typeof rank === "string" &&
            name &&
            chat &&
            name !== process.env.USERNAME!
        ) {
            await channel.send(
                `**${rank}${escapeMarkdown(name)}**: ${plainTextToDiscord(
                    chat
                )}`
            );
        }
    }
});

//@ts-ignore
const imgur = new i.ImgurClient({ clientId: process.env.IMGUR_ID! }) as i;

const notifications = new Collection<(msg: string) => boolean, () => void>();

client.on("messageCreate", async (message) => {
    if (
        message.author.bot ||
        message.author.id === client.user!.id ||
        message.channel.id !== process.env.CHANNEL_ID!
    )
        return;

    message.content = message.content.trim();

    if (message.content.startsWith("$")) {
        const [command, ...args] = message.content.slice(1).split(/\s+/);

        if (command === "pingonjoin") {
            const ign = args[0].toLowerCase();

            let n = args[0];

            notifications.set(
                (raw) => {
                    const [, name, lj] = Array.from(
                        raw.match(GUILD_UPDATE) ?? []
                    );

                    const matches =
                        typeof lj === "string" &&
                        typeof name === "string" &&
                        lj === "joined" &&
                        name.toLowerCase() === ign;

                    if (matches) n = name;

                    return matches;
                },
                () => {
                    channel.send(`<@${message.author.id}> ${n} is now online.`);
                }
            );

            await channel.send(
                `:white_check_mark: You will now be notified when they join.`
            );
        }

        if (command === "listonline") {
            let seenSeparator = false;

            const lines: string[] = [];

            const handler: Parameters<typeof bot.on<"message">>[1] = async (
                message
            ) => {
                if (message.extra?.length === 100) return;

                const raw = message.toString();

                if (raw === "Woah there, slow down!")
                    await bot.waitForTicks(200);

                if (raw === SEPARATOR) {
                    if (seenSeparator) {
                        bot.off("message", handler);

                        const built = lines.join("\n");

                        const members = built
                            .split(/^\s*-- \S+ --\s*$/m)
                            .slice(1);

                        members[members.length - 1] = members
                            .at(-1)!
                            .slice(0, members.at(-1)!.indexOf("Total Members"));

                        const list = members.flatMap((m) =>
                            m
                                .split("●")
                                .map((f) => f.trim())
                                .filter(Boolean)
                        );

                        await channel.send(
                            `**${list.length}** members online:\n` +
                                list.sort().join("\n")
                        );

                        return;
                    }

                    seenSeparator = true;
                } else lines.push(raw);
            };

            bot.on("message", handler);

            bot.chat("/g online");
        }

        return;
    }

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
