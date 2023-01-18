import type { PatternContext } from "../types.js";

export default async ({ bridge }: PatternContext) => {
    await bridge.send(`**Guild quest completed!**`);
};
