import { CommandInteraction, GuildBasedChannel, Message, Permissions, TextBasedChannel } from "discord.js"
import { Command, Categories, NypsiCommandInteraction } from "../utils/models/Command"
import { ErrorEmbed, CustomEmbed } from "../utils/models/EmbedBuilders.js"

const cooldown = new Map()

const cmd = new Command(
    "lockdown",
    "lockdown a channel (will only work if permissions are setup correctly)",
    Categories.MODERATION
)
    .setAliases(["lock", "shutup"])
    .setPermissions(["MANAGE_MESSAGES", "MANAGE_CHANNELS"])

cmd.slashEnabled = true
cmd.slashData.addChannelOption((option) => option.setName("channel").setDescription("channel to lock").setRequired(false))

/**
 * @param {Message} message
 * @param {Array<String>} args
 */
async function run(message: Message | (NypsiCommandInteraction & CommandInteraction), args: string[]) {
    const send = async (data) => {
        if (!(message instanceof Message)) {
            await message.reply(data)
            const replyMsg = await message.fetchReply()
            if (replyMsg instanceof Message) {
                return replyMsg
            }
        } else {
            return await message.channel.send(data)
        }
    }

    if (
        !message.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS) ||
        !message.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)
    ) {
        if (message.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) {
            return send({
                embeds: [new ErrorEmbed("you need the `manage channels` and `manage messages` permission")],
            })
        }
        return
    }

    if (
        !message.guild.me.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS) ||
        !message.guild.me.permissions.has(Permissions.FLAGS.MANAGE_ROLES)
    ) {
        return send({
            embeds: [new ErrorEmbed("i need the `manage channels` and `manage roles` permission for this command to work")],
        })
    }

    if (cooldown.has(message.member.id)) {
        const init = cooldown.get(message.member.id)
        const curr = new Date()
        const diff = Math.round((curr.getTime() - init) / 1000)
        const time = 1 - diff

        const minutes = Math.floor(time / 60)
        const seconds = time - minutes * 60

        let remaining: string

        if (minutes != 0) {
            remaining = `${minutes}m${seconds}s`
        } else {
            remaining = `${seconds}s`
        }
        return send({ embeds: [new ErrorEmbed(`still on cooldown for \`${remaining}\``)] })
    }

    let channel: TextBasedChannel | GuildBasedChannel = message.channel

    if (args.length != 0) {
        const id = args[0]

        channel = message.guild.channels.cache.find((ch) => ch.id == id)

        if (!channel) {
            return send({ embeds: [new ErrorEmbed("invalid channel")] })
        } else if (message instanceof Message && message.mentions.channels.first()) {
            channel = message.mentions.channels.first()
        }

        if (channel.type != "GUILD_TEXT") {
            return send({ embeds: [new ErrorEmbed("invalid channel")] })
        }
    }

    if (channel.type != "GUILD_TEXT") return

    cooldown.set(message.member.id, new Date())
    setTimeout(() => {
        cooldown.delete(message.author.id)
    }, 1000)

    let locked = false

    const role = message.guild.roles.cache.find((role) => role.name == "@everyone")

    const a = channel.permissionOverwrites.cache.get(role.id)

    if (!a) {
        locked = false
    } else if (!a.deny) {
        locked = false
    } else if (!a.deny.bitfield) {
        locked = false
    } else {
        const b = new Permissions(a.deny.bitfield).toArray()
        if (b.includes("SEND_MESSAGES")) {
            locked = true
        }
    }

    if (!locked) {
        await channel.permissionOverwrites.edit(role, {
            SEND_MESSAGES: false,
        })

        const embed = new CustomEmbed(message.member, false, "✅ " + channel.toString() + " has been locked")

        return send({ embeds: [embed] }).catch(() => {
            return message.member.send({ embeds: [embed] }).catch()
        })
    } else {
        await channel.permissionOverwrites.edit(role, {
            SEND_MESSAGES: null,
        })
        const embed = new CustomEmbed(message.member, false, "✅ " + channel.toString() + " has been unlocked")

        return send({ embeds: [embed] }).catch(() => {
            return message.member.send({ embeds: [embed] })
        })
    }
}

cmd.setRun(run)

module.exports = cmd
