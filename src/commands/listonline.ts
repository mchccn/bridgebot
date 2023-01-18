import { SEPARATOR } from "../constants.js";
import type { CommandContext } from "../types.js";

export default async ({ bridge, mineflayer }: CommandContext) => {
    let seenSeparator = false;

    const lines: string[] = [];

    const handler: Parameters<typeof mineflayer.on<"message">>[1] = async (
        message
    ) => {
        if (message.extra?.length === 100) return;

        const raw = message.toString();

        if (raw === "Woah there, slow down!")
            await mineflayer.waitForTicks(200);

        if (raw === SEPARATOR) {
            if (seenSeparator) {
                mineflayer.off("message", handler);

                const built = lines.join("\n");

                const members = built.split(/^\s*-- \S+ --\s*$/m).slice(1);

                members[members.length - 1] = members
                    .at(-1)!
                    .slice(0, members.at(-1)!.indexOf("Total Members"));

                const list = members.flatMap((m) =>
                    m
                        .split("●")
                        .map((f) => f.trim())
                        .filter(Boolean)
                );

                await bridge.send(
                    `**${list.length}** members online:\n` +
                        list.sort().join("\n")
                );

                return;
            }

            seenSeparator = true;
        } else lines.push(raw);
    };

    mineflayer.on("message", handler);

    mineflayer.chat("/g online");
};
