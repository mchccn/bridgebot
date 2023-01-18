import { HYPIXEL } from "../constants.js";
import { escapeDiscordMarkdown, plainTextToDiscord } from "../formatting.js";
import type { PatternContext } from "../types.js";

export default async ({
    args: [rank = "", name, , chat],
    discord,
    bridge,
    mineflayer,
}: PatternContext) => {
    if (name === process.env.USERNAME!) return;

    chat = chat.trim();

    if (chat.startsWith("$")) {
        const [key, ...args] = chat.slice(1).split(/\s+/);

        if (key === "fkdr") {
            const [player] = args;

            const stats = await HYPIXEL.getPlayer(player);

            const bedwars = stats.stats?.bedwars;

            if (!bedwars)
                return mineflayer.chat("No stats available for that player.");

            return mineflayer.chat(
                `${stats.nickname}'s overall FKDR is ${bedwars.finalKDRatio}.`
            );
        }

        return mineflayer.chat("Unknown command.");
    }

    await bridge.send(
        `**${rank}${escapeDiscordMarkdown(name)}**: ${plainTextToDiscord(
            discord,
            chat
        )}`
    );
};
