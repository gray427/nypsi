import { CommandInteraction, Message, MessageActionRow, MessageButton } from "discord.js"
import { Command, Categories, NypsiCommandInteraction } from "../utils/models/Command"
import { ErrorEmbed, CustomEmbed } from "../utils/models/EmbedBuilders"
import { userExists, createUser, getInventory, setInventory } from "../utils/economy/utils"

const cmd = new Command("clearinventory", "clear your inventory. this cannot be undone", Categories.MONEY).setAliases([
    "clearinv",
])

/**
 *
 * @param {Message} message
 * @param {Array<String>} args
 */
async function run(message: Message | (NypsiCommandInteraction & CommandInteraction)) {
    if (!userExists(message.member)) createUser(message.member)

    const inventory = getInventory(message.member)

    let amount = 0

    for (const item of Array.from(Object.keys(inventory))) {
        amount += inventory[item]
    }

    if (amount == 0) {
        return message.channel.send({ embeds: [new ErrorEmbed("you dont have anything in your inventory")] })
    }

    const embed = new CustomEmbed(message.member, false)

    embed.setDescription(`are you sure you want to clear your inventory of **${amount}** items?\n\nthis cannot be undone.`)

    const row = new MessageActionRow().addComponents(
        new MessageButton().setCustomId("❌").setLabel("clear").setStyle("DANGER")
    )

    const msg = await message.channel.send({ embeds: [embed], components: [row] })

    const filter = (i) => i.user.id == message.author.id

    const reaction = await msg
        .awaitMessageComponent({ filter, time: 15000 })
        .then(async (collected) => {
            await collected.deferUpdate()
            return collected.customId
        })
        .catch(async () => {
            await msg.edit({ components: [] })
        })

    if (reaction == "❌") {
        setInventory(message.member, {})

        embed.setDescription("✅ your inventory has been cleared")

        await msg.edit({ embeds: [embed], components: [] })
    }
}

cmd.setRun(run)

module.exports = cmd
