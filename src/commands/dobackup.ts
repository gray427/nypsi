import { CommandInteraction, Message } from "discord.js"
import { Command, Categories, NypsiCommandInteraction } from "../utils/models/Command"
import { CustomEmbed } from "../utils/models/EmbedBuilders"
import { doBackup } from "../utils/database/database"

const cmd = new Command("dobackup", "start a database backup", Categories.NONE).setPermissions(["bot owner"])

/**
 * @param {Message} message
 * @param {Array<String>} args
 */
async function run(message: Message | (NypsiCommandInteraction & CommandInteraction)) {
    if (message.member.user.id != "672793821850894347") return

    doBackup()

    return message.channel.send({
        embeds: [new CustomEmbed(message.member, false, "backup started, check console for more info")],
    })
}

cmd.setRun(run)

module.exports = cmd
