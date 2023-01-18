import { ChannelType, Client, Collection, TextChannel } from "discord.js";
import "dotenv/config";
import { readdir } from "fs/promises";
import { createBot } from "mineflayer";
import { join } from "path";
import { Stream } from "stream";
import { PING_ON_JOIN_NOTIFICATIONS } from "./commands/pingonjoin.js";
import * as CONSTANTS from "./constants.js";
import { IMGUR, ROOT_DIR } from "./constants.js";
import { discordMessageAsPlainText } from "./formatting.js";
import type { CommandContext, PatternContext } from "./types.js";

const discord = new Client({
    intents: ["MessageContent", "GuildMessages", "GuildMembers"],
});

await discord.login(process.env.TOKEN!);

const guild = await discord.guilds.fetch(process.env.GUILD_ID!);

await guild.members.fetch();

const bridge = (await guild.channels.fetch(
    process.env.CHANNEL_ID!
)) as TextChannel;

const commands = new Collection<
    string,
    {
        execute: (ctx: CommandContext) => void;
    }
>();

const patterns = new Collection<
    string,
    {
        execute: (ctx: PatternContext) => void;
    }
>();

await readdir(join(ROOT_DIR, "commands"))
    .then((files) =>
        Promise.all(
            files.map((f) => import(join(ROOT_DIR, "commands", f)))
        ).then((mods) => mods.map((m, i) => [files[i], m] as const))
    )
    .then((mods) => {
        mods.forEach(([name, mod]) => {
            commands.set(name.split(".").slice(0, -1).join("."), {
                execute: mod.default,
            });
        });
    });

await readdir(join(ROOT_DIR, "patterns"))
    .then((files) =>
        Promise.all(
            files.map((f) => import(join(ROOT_DIR, "patterns", f)))
        ).then((mods) => mods.map((m, i) => [files[i], m] as const))
    )
    .then((mods) => {
        mods.forEach(([name, mod]) => {
            patterns.set(name.split(".").slice(0, -1).join("."), {
                execute: mod.default,
            });
        });
    });

await bridge.send("Starting bridge...");

const mineflayer = createBot({
    host: "mc.hypixel.net",
    version: "1.8.9",
    auth: "microsoft",
    username: process.env.USERNAME!,
    password: process.env.PASSWORD!,
    defaultChatPatterns: false,
    checkTimeoutInterval: 30000,
})
    .on("spawn", async () => {
        await mineflayer.waitForChunksToLoad();

        await mineflayer.waitForTicks(12);

        await bridge.send("Connected to Hypixel!");

        mineflayer.chat("/chat g");
    })
    .on("message", async (message) => {
        if (message.extra?.length === 100) return;

        const raw = message.toString().trim();

        if (raw.includes("Woah there, slow down!"))
            await mineflayer.waitForTicks(200);

        console.log(raw);

        PING_ON_JOIN_NOTIFICATIONS.forEach((exec, condition) => {
            if (condition(raw)) {
                exec();

                PING_ON_JOIN_NOTIFICATIONS.delete(condition);
            }
        });

        patterns.forEach((pattern, key) => {
            const regex = CONSTANTS[key as keyof typeof CONSTANTS];

            if (!(regex instanceof RegExp))
                throw new TypeError("Pattern file uses an invalid name.");

            const matches = raw.match(regex);

            if (matches) {
                const args = Array.from(matches).slice(1);

                pattern.execute({ message, args, bridge, discord, mineflayer });
            }
        });
    });

discord.on("messageCreate", async (message) => {
    if (
        !message.guild ||
        message.channel.type !== ChannelType.GuildText ||
        message.author.bot ||
        message.author.id === discord.user!.id ||
        message.channel.id !== process.env.CHANNEL_ID!
    )
        return;

    message.content = message.content.trim();

    if (message.content.startsWith("$")) {
        const [key, ...args] = message.content.slice(1).split(/\s+/);

        const command = commands.get(key);

        if (!command) return void bridge.send("Unknown command.");

        return command.execute({ message, args, bridge, discord, mineflayer });
    }

    if (message.attachments.size) {
        const links = await Promise.all(
            message.attachments.map((a) => {
                if (a.attachment instanceof Stream) return undefined;

                return IMGUR.upload({ image: a.attachment }).then(
                    (r) => r.data.link
                );
            })
        );

        message.content +=
            (message.content ? " " : "") + links.filter(Boolean).join(" ");
    }

    const chunks = discordMessageAsPlainText(message);

    for (const chunk of chunks) {
        mineflayer.chat(chunk);

        await new Promise((resolve) =>
            setTimeout(resolve, Math.floor(Math.random() * 50) + 200)
        );
    }
});
