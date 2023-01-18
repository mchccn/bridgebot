import { Collection } from "discord.js";
import { GUILD_UPDATE } from "../constants.js";
import type { CommandContext } from "../types.js";

export const PING_ON_JOIN_NOTIFICATIONS = new Collection<
    (msg: string) => boolean,
    () => void
>();

export default async ({ message, args, bridge }: CommandContext) => {
    const ign = args[0].toLowerCase();

    let n = args[0];

    PING_ON_JOIN_NOTIFICATIONS.set(
        (raw) => {
            const [, name, lj] = Array.from(raw.match(GUILD_UPDATE) ?? []);

            const matches =
                typeof lj === "string" &&
                typeof name === "string" &&
                lj === "joined" &&
                name.toLowerCase() === ign;

            if (matches) n = name;

            return matches;
        },
        () => bridge.send(`<@${message.author.id}> ${n} is now online.`)
    );

    await bridge.send(
        `:white_check_mark: You will now be notified when they join.`
    );
};
