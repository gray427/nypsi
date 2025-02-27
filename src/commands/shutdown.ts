import { CommandInteraction, Message } from "discord.js"
import { Command, Categories, NypsiCommandInteraction } from "../utils/models/Command"
import { CustomEmbed } from "../utils/models/EmbedBuilders.js"
import { startRestart } from "../utils/commandhandler"
import { vacuum } from "../utils/database/database"
import { logger } from "../utils/logger"

const cmd = new Command("shutdown", "shutdown bot", Categories.NONE).setPermissions(["bot owner"])

let confirm = false

/**
 * @param {Message} message
 * @param {Array<String>} args
 */
async function run(message: Message | (NypsiCommandInteraction & CommandInteraction)) {
    if (message.member.user.id != "672793821850894347") return

    if (confirm == false) {
        confirm = true
        setTimeout(() => {
            confirm = false
        }, 120000)
        return message.channel.send({
            embeds: [new CustomEmbed(message.member, false, "run command again to confirm")],
        })
    } else {
        startRestart()

        logger.info("nypsi shutting down soon...")

        setTimeout(() => {
            logger.info("vacuuming database...")
            vacuum()
            logger.info("vacuum finished")

            logger.info("nypsi shutting down in 10 seconds...")

            setTimeout(() => {
                logger.info("nypsi shutting down...")
                process.exit()
            }, 10000)
        }, 20000)

        return message.channel.send({
            embeds: [new CustomEmbed(message.member, false, "✅ bot will shut down soon")],
        })
    }
}

cmd.setRun(run)

module.exports = cmd
