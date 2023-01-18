import type { Client, Message, TextChannel } from "discord.js";
import type { Bot } from "mineflayer";

export interface CommandContext {
    message: Message;
    bridge: TextChannel;
    discord: Client;
    mineflayer: Bot;
    args: string[];
}

export interface PatternContext {
    message: ChatMessage;
    bridge: TextChannel;
    discord: Client;
    mineflayer: Bot;
    args: string[];
}

declare const on: Bot["on"];
export type ChatMessage = Parameters<Parameters<typeof on<"message">>[1]>[0];
