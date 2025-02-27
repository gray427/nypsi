import { CommandInteraction, Message, Permissions } from "discord.js"
import { getPrefix } from "../utils/guilds/utils"
import { getCase, setReason } from "../utils/moderation/utils"
import { Command, Categories, NypsiCommandInteraction } from "../utils/models/Command"
import { ErrorEmbed, CustomEmbed } from "../utils/models/EmbedBuilders.js"

const cmd = new Command("reason", "set a reason for a case/punishment", Categories.MODERATION).setPermissions([
    "MANAGE_MESSAGES",
])

/**
 * @param {Message} message
 * @param {Array<String>} args
 */
async function run(message: Message | (NypsiCommandInteraction & CommandInteraction), args: Array<string>) {
    if (!message.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) return

    const prefix = getPrefix(message.guild)

    if (args.length <= 1) {
        const embed = new CustomEmbed(message.member)
            .setHeader("reason help")
            .addField("usage", `${prefix}reason <case ID> <new reason>`)
            .addField("help", "use this command to change the current reason for a punishment case")

        return await message.channel.send({ embeds: [embed] })
    }

    const caseID = args[0]

    args.shift()

    const reason = args.join(" ")

    const case0 = getCase(message.guild, parseInt(caseID))

    if (!case0) {
        return message.channel.send({
            embeds: [new ErrorEmbed("couldn't find a case with the id `" + caseID + "`")],
        })
    }

    setReason(message.guild, parseInt(caseID), reason)

    const embed = new CustomEmbed(message.member).setDescription("✅ case updated")

    return message.channel.send({ embeds: [embed] })
}

cmd.setRun(run)

module.exports = cmd
