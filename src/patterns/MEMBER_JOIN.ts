import { escapeDiscordMarkdown } from "../formatting.js";
import type { PatternContext } from "../types.js";

export default async ({ args: [rank = "", name], bridge }: PatternContext) => {
    await bridge.send(
        `**${rank}${escapeDiscordMarkdown(name)}** has joined the guild!`
    );
};
