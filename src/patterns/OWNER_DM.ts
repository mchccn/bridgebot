import type { PatternContext } from "../types.js";

export default ({ args: [dm], mineflayer }: PatternContext) => {
    const [command, ...args] = dm.trim().split(/\s+/);

    if (command === "say") {
        mineflayer.chat(args.join(" "));
    }
};
