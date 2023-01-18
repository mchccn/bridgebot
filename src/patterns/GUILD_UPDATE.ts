import { escapeDiscordMarkdown } from "../formatting.js";
import type { PatternContext } from "../types.js";

export default async ({ args: [name, lj], bridge }: PatternContext) => {
    await bridge.send(`**${escapeDiscordMarkdown(name)}** ${lj}.`);
};
