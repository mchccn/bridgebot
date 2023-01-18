import { escapeDiscordMarkdown } from "../formatting.js";
import type { PatternContext } from "../types.js";

export default async ({
    args: [victimrank = "", victimname, kickerrank = "", kickername],
    bridge,
}: PatternContext) => {
    await bridge.send(
        `**${victimrank}${escapeDiscordMarkdown(
            victimname
        )}** was kicked from the guild by **${kickerrank}${escapeDiscordMarkdown(
            kickername
        )}**!`
    );
};
