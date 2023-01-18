import Hypixel from "hypixel-api-reborn";
import i from "imgur";
import { sep } from "path";

export const CHAT_REGEX =
    /^Guild > (\[.*]\s*)?([\w]{2,17}).*?(\[.{1,15}])?: (.*)$/;
export const GUILD_UPDATE = /^Guild > ([\w]{2,17}).*? (joined|left)\.$/;
export const ROLE_UPDATE =
    /^(\[.*]\s*)?([\w]{2,17}).*? was (promoted|demoted) from (.*) to (.*)$/;
export const MEMBER_JOIN = /^(\[.*]\s*)?([\w]{2,17}).*? joined the guild!$/;
export const MEMBER_LEAVE = /^(\[.*]\s*)?(\w{2,17}).*? left the guild!$/;
export const MEMBER_KICKED =
    /^(\[.*]\s*)?(\w{2,17}).*? was kicked from the guild by (\[.*]\s*)?(\w{2,17}).*?!$/;
export const LEVEL_UP = /^\s{19}The Guild has reached Level (\d*)!$/;
export const QUEST_COMPLETE = /^\s{17}GUILD QUEST COMPLETED!$/;
export const TIER_COMPLETE = /^\s{17}GUILD QUEST TIER (\d*) COMPLETED!$/;
export const MENTION_REGEX = /@(\S+)/g;
export const OWNER_DM = new RegExp(
    String.raw`^From (?:\[.*]\s*)?${process.env.DEVELOPER_IGN}:(.*)$`
);

export const SEPARATOR =
    "-----------------------------------------------------";

export const ROOT_DIR = new URL(import.meta.url).pathname
    .split(sep)
    .slice(0, -1)
    .join(sep);

//@ts-ignore
export const IMGUR = new i.ImgurClient({
    clientId: process.env.IMGUR_ID!,
}) as i;

export const HYPIXEL = new Hypixel.Client(process.env.HYPIXEL_KEY!);
