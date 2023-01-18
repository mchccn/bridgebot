import { escapeDiscordMarkdown } from "../formatting.js";
import type { PatternContext } from "../types.js";

export default async ({
    args: [rank = "", name, pd, from, to],
    bridge,
}: PatternContext) => {
    await bridge.send(
        `**${rank}${escapeDiscordMarkdown(
            name
        )}** was ${pd} from *${from}* to *${to}*.`
    );
};
