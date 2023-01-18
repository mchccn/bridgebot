import type { PatternContext } from "../types.js";

export default async ({ args: [tier], bridge }: PatternContext) => {
    await bridge.send(`**Guild quest tier ${tier} completed!**`);
};
