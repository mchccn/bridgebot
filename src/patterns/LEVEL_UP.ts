import type { PatternContext } from "../types.js";

export default async ({ args: [level], bridge }: PatternContext) => {
    await bridge.send(`**The guild has reached level ${level}!**`);
};
