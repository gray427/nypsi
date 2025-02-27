import { CommandInteraction, Message, Permissions } from "discord.js"
import { getPrefix, getDisabledCommands, updateDisabledCommands } from "../utils/guilds/utils"
import { Command, Categories, NypsiCommandInteraction } from "../utils/models/Command"
import { ErrorEmbed, CustomEmbed } from "../utils/models/EmbedBuilders.js"
import { commandExists } from "../utils/commandhandler"

const cmd = new Command("disablecommand", "disable certain commands in your server", Categories.ADMIN)
    .setAliases(["disablecmd", "disable"])
    .setPermissions(["MANAGE_SERVER"])

/**
 * @param {Message} message
 * @param {Array<String>} args
 */
async function run(message: Message | (NypsiCommandInteraction & CommandInteraction), args: Array<string>) {
    if (!message.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD)) {
        if (message.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) {
            return message.channel.send({ embeds: [new ErrorEmbed("you need the `manage server` permission")] })
        }
        return
    }

    let filter = getDisabledCommands(message.guild)

    const prefix = getPrefix(message.guild)

    if (args.length == 0) {
        const embed = new CustomEmbed(message.member, false, "`" + filter.join("`\n`") + "`")
            .setHeader("disabled commands")
            .setFooter(`use ${prefix}disablecmd (add/del/+/-) to modify the list`)

        if (filter.length == 0) {
            embed.setDescription("`❌` no commands disabled")
        }

        return message.channel.send({ embeds: [embed] })
    }

    if (args[0].toLowerCase() == "add" || args[0].toLowerCase() == "+") {
        if (args.length == 1) {
            return message.channel.send({ embeds: [new ErrorEmbed(`${prefix}disablecmd add/+ <command name>`)] })
        }

        const word = args[1]
            .toString()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[^A-z0-9\s]/g, "")

        if (filter.indexOf(word) > -1) {
            const embed = new CustomEmbed(
                message.member,
                false,
                "❌ `" + getPrefix(message.guild) + word + "` is already disabled"
            ).setFooter(`you can use ${prefix}disablecmd to view currently disabled commands`)

            return message.channel.send({ embeds: [embed] })
        }

        if (!commandExists(word)) {
            return message.channel.send({
                embeds: [
                    new ErrorEmbed(
                        `you must use the command's name, you can use ${getPrefix(message.guild)}help <command> to find this`
                    ),
                ],
            })
        }

        if (word == "disablecommand") {
            return message.channel.send({ embeds: [new CustomEmbed(message.member, false, "nice try")] })
        }

        filter.push(word)

        if (filter.join("").length > 1000) {
            filter.splice(filter.indexOf(word), 1)

            const embed = new CustomEmbed(
                message.member,
                true,
                `❌ filter has exceeded the maximum size - please use *${prefix}disablecmd del/-* or *${prefix}disablecmd reset*`
            ).setHeader("chat filter")

            return message.channel.send({ embeds: [embed] })
        }

        updateDisabledCommands(message.guild, filter)

        const embed = new CustomEmbed(
            message.member,
            true,
            "✅ disabled `" + getPrefix(message.guild) + word + "` command"
        ).setHeader("disabled commands")
        return message.channel.send({ embeds: [embed] })
    } else if (args[0].toLowerCase() == "del" || args[0].toLowerCase() == "-") {
        if (args.length == 1) {
            return message.channel.send({ embeds: [new ErrorEmbed(`${prefix}disablecmd del/- <command>`)] })
        }

        const word = args[1]
            .toString()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[^A-z0-9\s]/g, "")

        if (filter.indexOf(word) > -1) {
            filter.splice(filter.indexOf(word), 1)
        } else {
            const embed = new CustomEmbed(
                message.member,
                false,
                "❌ `" + getPrefix(message.guild) + word + "` is not disabled"
            )
                .setHeader("disabled commands")
                .setFooter(`you can use ${prefix}disablecmd to view currently disabled commands`)

            return message.channel.send({ embeds: [embed] })
        }

        updateDisabledCommands(message.guild, filter)

        const embed = new CustomEmbed(
            message.member,
            false,
            "✅ `" + getPrefix(message.guild) + word + "` is no longer disabled"
        )
            .setHeader("disable commands")
            .setFooter(`you can use ${prefix}disablecmd reset to reset disabled commands`)

        return message.channel.send({ embeds: [embed] })
    } else if (args[0].toLowerCase() == "reset") {
        filter = []

        updateDisabledCommands(message.guild, filter)

        const embed = new CustomEmbed(message.member, false, "✅ disabled commands have been").setHeader("disabled commands")

        return message.channel.send({ embeds: [embed] })
    } else {
        const embed = new CustomEmbed(message.member, false, "`" + filter.join("`\n`") + "`")
            .setHeader("disabled commands")
            .setFooter(`use ${prefix}disablecmd (add/del/+/-) to modify the list`)

        if (filter.length == 0) {
            embed.setDescription("`❌` no commands disabled")
        }

        return message.channel.send({ embeds: [embed] })
    }
}

cmd.setRun(run)

module.exports = cmd
