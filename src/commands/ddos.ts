import { CommandInteraction, Message } from "discord.js"
import { getMember } from "../utils/functions/member"
import { Command, Categories, NypsiCommandInteraction } from "../utils/models/Command"
import { ErrorEmbed, CustomEmbed } from "../utils/models/EmbedBuilders.js"

const cooldown = new Map()

const cmd = new Command("ddos", "ddos other users (fake)", Categories.FUN).setAliases(["hitoff"])

/**
 * @param {Message} message
 * @param {Array<String>} args
 */
async function run(message: Message | (NypsiCommandInteraction & CommandInteraction), args: Array<string>) {
    if (cooldown.has(message.member.id)) {
        const init = cooldown.get(message.member.id)
        const curr = new Date()
        const diff = Math.round((curr.getTime() - init) / 1000)
        const time = 5 - diff

        const minutes = Math.floor(time / 60)
        const seconds = time - minutes * 60

        let remaining: string

        if (minutes != 0) {
            remaining = `${minutes}m${seconds}s`
        } else {
            remaining = `${seconds}s`
        }
        return message.channel.send({ embeds: [new ErrorEmbed(`still on cooldown for \`${remaining}\``)] })
    }

    if (args.length == 0) {
        return message.channel.send({ embeds: [new ErrorEmbed("$ddos <user>")] })
    }

    let member

    if (args.length == 0) {
        member = message.member
    } else {
        if (!message.mentions.members.first()) {
            member = await getMember(message.guild, args[0])
        } else {
            member = message.mentions.members.first()
        }
    }

    if (!member) {
        return message.channel.send({ embeds: [new ErrorEmbed("invalid user")] })
    }

    const ip = `${randNumber()}.${randNumber()}.${randNumber()}.${randNumber()}`
    const port = `${randPort()}`

    cooldown.set(message.member.id, new Date())

    setTimeout(() => {
        cooldown.delete(message.author.id)
    }, 5000)

    const embed = new CustomEmbed(
        message.member,
        true,
        member.user.toString() +
            "\n\n" +
            "**ip** *obtaining..*" +
            "\n" +
            "**port** *waiting...*" +
            "\n\n" +
            "**status** *online*"
    ).setHeader("ddos tool")

    return message.channel.send({ embeds: [embed] }).then((m) => {
        embed.setDescription(
            member.user.toString() +
                "\n\n" +
                `**ip** *${ip}*` +
                "\n" +
                "**port** *scanning..*" +
                "\n\n" +
                "**status** *online*"
        )

        setTimeout(() => {
            m.edit({ embeds: [embed] }).then(() => {
                embed.setDescription(
                    member.user.toString() +
                        "\n\n" +
                        `**ip** *${ip}*` +
                        "\n" +
                        `**port** *${port}*` +
                        "\n\n" +
                        "**status** *online*"
                )

                setTimeout(() => {
                    m.edit({ embeds: [embed] }).then(() => {
                        embed.setDescription(
                            member.user.toString() +
                                "\n\n" +
                                `**ip** *${ip}*` +
                                "\n" +
                                `**port** *${port}*` +
                                "\n\n" +
                                "**status** *offline*"
                        )
                        embed.setColor("#5efb8f")

                        setTimeout(() => {
                            m.edit({ embeds: [embed] })
                        }, 1000)
                    })
                }, 1000)
            })
        }, 1000)
    })
}

function randNumber() {
    return Math.floor(Math.random() * 254) + 1
}

function randPort() {
    return Math.floor(Math.random() * 25565)
}

cmd.setRun(run)

module.exports = cmd
