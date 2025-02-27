import { Collection, GuildMember, Message, Permissions, ThreadMember, ThreadMemberManager } from "discord.js"
import { runCommand } from "../utils/commandhandler"
import { getDatabase } from "../utils/database/database"
import { userExists } from "../utils/economy/utils"
import { addCooldown, getChatFilter, getPrefix, hasGuild, inCooldown } from "../utils/guilds/utils"
import { logger } from "../utils/logger"
import { CustomEmbed } from "../utils/models/EmbedBuilders"
import { getTier, isPremium } from "../utils/premium/utils"
import doCollection from "../utils/workers/mentions"
import { cpu } from "node-os-utils"
import { getKarma, getLastCommand } from "../utils/karma/utils"
import ms = require("ms")
import { encrypt } from "../utils/functions/string"

declare function require(name: string)

const db = getDatabase()
const addMentionToDatabase = db.prepare(
    "INSERT INTO mentions (guild_id, target_id, date, user_tag, url, content) VALUES (?, ?, ?, ?, ?, ?)"
)
const fetchMentions = db.prepare("SELECT url FROM mentions WHERE guild_id = ? AND target_id = ? ORDER BY date DESC")
const deleteMention = db.prepare("DELETE FROM mentions WHERE url = ?")
let mentionInterval

/**
 * @param {Message} message
 */
export default async function messageCreate(message: Message) {
    if (message.author.bot) return

    if (message.channel.type == "DM") {
        logger.info("message in DM from " + message.author.tag + ": " + message.content)

        const embed = new CustomEmbed()
            .setTitle("support")
            .setColor("#36393f")
            .setDescription("support server: https://discord.gg/hJTDNST")
        return await message.channel.send({ embeds: [embed] })
    }

    message.content = message.content.replace(/ +(?= )/g, "") // remove any additional spaces

    if (hasGuild(message.guild)) {
        const filter = getChatFilter(message.guild)

        let content: string | string[] = message.content.toLowerCase().normalize("NFD")

        content = content.replace(/[^A-z0-9\s]/g, "")

        content = content.split(" ")

        for (const word of filter) {
            if (content.indexOf(word.toLowerCase()) != -1) {
                if (!message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
                    logger.debug(
                        `(${message.guild.id}) (${message.author.id}) (${message.author.tag}) message deleted: ${content}`
                    )
                    return await message.delete().catch(() => {})
                }
            }
        }
    }

    const { mentionQueue } = require("../utils/users/utils")

    if (
        message.guild.memberCount < 150000 &&
        (userExists(message.guild.ownerId) ||
            isPremium(message.guild.ownerId) ||
            getKarma(message.guild.ownerId) >= 5 ||
            getLastCommand(message.guild.ownerId) >= Date.now() - ms("1 week"))
    ) {
        if (message.mentions.everyone) {
            if (!inCooldown(message.guild) && message.guild.members.cache.size != message.guild.memberCount) {
                await message.guild.members.fetch()
                addCooldown(message.guild, 3600)
            }

            let members: Collection<string, GuildMember | ThreadMember> | ThreadMemberManager = message.channel.members

            if (members instanceof ThreadMemberManager) {
                members = members.cache
            }

            mentionQueue.push({
                type: "collection",
                members: members.clone(),
                message: message,
                channelMembers: message.channel.members,
                guild: message.guild,
                url: message.url,
            })

            if (!mentionInterval) {
                mentionInterval = setInterval(async () => await addMention(), 150)
            }
        } else {
            if (message.mentions.roles.first()) {
                if (!inCooldown(message.guild) && message.guild.members.cache.size != message.guild.memberCount) {
                    await message.guild.members.fetch()
                    addCooldown(message.guild, 3600)
                }

                let members: Collection<string, GuildMember | ThreadMember> | ThreadMemberManager = message.channel.members

                if (members instanceof ThreadMemberManager) {
                    members = members.cache
                }

                message.mentions.roles.forEach((r) => {
                    mentionQueue.push({
                        type: "collection",
                        members: r.members.clone(),
                        message: message,
                        channelMembers: members,
                        guild: message.guild,
                        url: message.url,
                    })
                })

                if (!mentionInterval) {
                    mentionInterval = setInterval(async () => await addMention(), 150)
                }
            }

            if (message.mentions.members.first()) {
                if (message.mentions.members.size == 1) {
                    if (message.mentions.members.first().user.id == message.author.id) return
                    let content = message.content

                    if (content.length > 100) {
                        content = content.substr(0, 97) + "..."
                    }

                    content = content.replace(/(\r\n|\n|\r)/gm, " ")

                    mentionQueue.push({
                        type: "mention",
                        data: {
                            user: message.author.tag,
                            content: content,
                            date: message.createdTimestamp,
                            link: message.url,
                        },
                        guild: message.guild.id,
                        target: message.mentions.members.first().user.id,
                    })
                } else {
                    mentionQueue.push({
                        type: "collection",
                        members: message.mentions.members.clone(),
                        message: message,
                        channelMembers: message.channel.members,
                        guild: message.guild,
                        url: message.url,
                    })
                }

                if (!mentionInterval) {
                    mentionInterval = setInterval(async () => await addMention(), 150)
                }
            }
        }
    }

    let prefix = getPrefix(message.guild)

    if (message.client.user.id == "685193083570094101") prefix = "£"

    if (message.content == `<@!${message.client.user.id}>`) {
        return message.channel.send({ content: `my prefix for this server is \`${prefix}\`` }).catch(() => {
            return message.member.send({
                content: `my prefix for this server is \`${prefix}\` -- i do not have permission to send messages in that channel`,
            })
        })
    }

    if (!message.content.startsWith(prefix)) return

    const args = message.content.substring(prefix.length).split(" ")

    const cmd = args[0].toLowerCase()

    return runCommand(cmd, message, args)
}

let currentInterval = 150
let lastChange = 0

async function addMention() {
    const { mentionQueue, deleteQueue } = require("../utils/users/utils")

    let mention

    if (mentionQueue.length == 0) {
        if (deleteQueue.length == 0) {
            clearInterval(mentionInterval)
            mentionInterval = undefined
            currentInterval = 150
        } else {
            mention = deleteQueue.shift()
        }
    } else {
        mention = mentionQueue.shift()
    }

    if (!mention) {
        clearInterval(mentionInterval)
        mentionInterval = undefined
        return
    }

    if (mention.type == "collection") {
        const members = mention.members

        if (members.size > 200) {
            logger.debug(`${members.size.toLocaleString()} mentions being inserted with worker..`)
            const start = Date.now()
            await doCollection(mention).catch((e) => {
                logger.error("error inserting mentions with worker")
                logger.error(e)
            })
            logger.debug(`${members.size.toLocaleString()} mentions inserted in ${(Date.now() - start) / 1000}s`)

            return
        }

        let content = mention.message.content

        if (content.length > 100) {
            content = content.substr(0, 97) + "..."
        }

        content = content.replace(/(\r\n|\n|\r)/gm, " ")

        let count = 0

        let channelMembers = mention.channelMembers

        for (const memberID of Array.from(members.keys())) {
            if (count >= 50) {
                return mentionQueue.push({
                    type: "collection",
                    members: members.clone(),
                    message: mention.message,
                    channelMembers: channelMembers,
                })
            }
            const member = members.get(memberID)

            members.delete(memberID)

            if (member.user.bot) continue
            if (member.user.id == mention.message.author.id) continue

            try {
                if (!channelMembers.has(memberID)) continue
            } catch {
                channelMembers = channelMembers.cache
                if (!channelMembers.has(memberID)) continue
            }

            const data = {
                user: mention.message.author.tag,
                content: content,
                date: mention.message.createdTimestamp,
                link: mention.message.url,
            }

            const guild = mention.message.guild.id

            mentionQueue.push({
                type: "mention",
                data: data,
                guild: guild,
                target: member.user.id,
            })
            count++
        }
    } else if (mention.type == "mention") {
        const guild = mention.guild
        const data = mention.data
        const target = mention.target

        const content: string = encrypt(data.content)

        addMentionToDatabase.run(guild, target, Math.floor(data.date / 1000), data.user, data.link, content)

        const mentions = fetchMentions.all(guild, target)

        let limit = 6

        if (isPremium(target)) {
            const tier = getTier(target)

            limit += tier * 2
        }

        if (mentions.length > limit) {
            mentions.splice(0, limit)

            for (const m of mentions) {
                if (deleteQueue.indexOf(m.url) != -1) return
                deleteQueue.push(m.url)
            }
        }

        if (mentionQueue.length == 0 && deleteQueue.length == 0) {
            clearInterval(mentionInterval)
            mentionInterval = undefined
            currentInterval = 100
            return
        }
    } else {
        deleteMention.run(mention)
    }

    if (mentionQueue.length == 0 && deleteQueue.length == 0) {
        clearInterval(mentionInterval)
        mentionInterval = undefined
        currentInterval = 150
    }

    const cpuUsage = await cpu.usage()

    const old = currentInterval

    if (cpuUsage > 90) {
        currentInterval = 700
    } else if (cpuUsage > 80) {
        currentInterval = 450
    } else if (cpuUsage < 80) {
        currentInterval = 75
    } else {
        currentInterval = 75
    }

    if (currentInterval != old) {
        if (Date.now() - lastChange < 5000) return
        clearInterval(mentionInterval)
        mentionInterval = setInterval(async () => await addMention(), currentInterval)

        lastChange = Date.now()
    }

    /**
     * @type {Array<{ type: String, members: Collection, message: Message, guild: String }>}
     */
    exports.mentionQueue = mentionQueue
}

function cleanMentions() {
    const limit = Math.floor((Date.now() - 86400000 * 3) / 1000) // 3 days

    const { changes } = db.prepare("DELETE FROM mentions WHERE date < ?").run(limit)

    if (changes > 0) logger.info(`${changes} mentions deleted`)
}

setInterval(cleanMentions, 3600 * 1000)
