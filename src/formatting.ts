import { Client, MessageMentions, type Message } from "discord.js";
import { MENTION_REGEX } from "./constants.js";

export function discordMessageAsPlainText(message: Message) {
    const raw = message.content;

    let formatted = raw
        .replace(
            new RegExp(MessageMentions.UsersPattern.source, "g"),
            (_, id) => {
                const user = message.client.users.cache.get(id);

                if (user) return `@${user.username}#${user.discriminator}`;

                return "@[unknown]";
            }
        )
        .replace(
            new RegExp(MessageMentions.ChannelsPattern.source, "g"),
            (_, id) => {
                const channel = message.client.channels.cache.get(id);

                if (channel)
                    return "name" in channel
                        ? `#${channel.name ?? "[unknown]"}`
                        : "#[unknown]";

                return "#[unknown]";
            }
        )
        .replace(new RegExp(MessageMentions.RolesPattern, "g"), (_, id) => {
            const role = message.guild!.roles.cache.get(id);

            if (role) return `@${role.name}`;

            return "@[unknown]";
        });

    const prefix = `${message.author.username}#${message.author.discriminator} `;

    const pointer = "> ";

    if (formatted.length <= 100 - prefix.length - pointer.length)
        return [prefix + pointer + formatted];

    const count = Math.ceil(formatted.length / 100);

    const chunks = [];

    while (formatted) {
        const header: string = `(${chunks.length + 1}/${count}) ${pointer}`;

        const chunk = formatted.slice(0, 100 - prefix.length - header.length);

        chunks.push(prefix + header + chunk);

        formatted = formatted.slice(100);
    }

    return chunks;
}

export const escapeDiscordMarkdown = (text: string) =>
    text.replace(/\\(\*|_|`|~|\\)/g, "$1").replace(/(\*|_|`|~|\\)/g, "\\$1");

export function plainTextToDiscord(client: Client, message: string) {
    return escapeDiscordMarkdown(
        message.replace(MENTION_REGEX, (_, username) => {
            const user = client.users.cache.find(
                (user) =>
                    user.username
                        .toLowerCase()
                        .localeCompare(username.toLowerCase()) === 0
            );

            if (user) return `<@${user.id}>`;

            return _;
        })
    );
}
