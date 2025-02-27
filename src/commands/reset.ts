import { CommandInteraction, Message, MessageActionRow, MessageButton } from "discord.js"
import {
    getXp,
    getPrestige,
    userExists,
    createUser,
    getMulti,
    getInventory,
    getBalance,
    deleteUser,
    getItems,
} from "../utils/economy/utils.js"
import { Command, Categories, NypsiCommandInteraction } from "../utils/models/Command"
import { CustomEmbed, ErrorEmbed } from "../utils/models/EmbedBuilders"
import { addKarma } from "../utils/karma/utils.js"

const cmd = new Command("reset", "reset your economy profile to gain karma", Categories.MONEY)

const cooldown = new Map()

/**
 *
 * @param {Message} message
 * @param {Array<String>} args
 */
async function run(message: Message | (NypsiCommandInteraction & CommandInteraction)) {
    if (cooldown.has(message.member.id)) {
        const init = cooldown.get(message.member.id)
        const curr = new Date()
        const diff = Math.round((curr.getTime() - init) / 1000)
        const time = 1800 - diff

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

    if (!userExists(message.member)) createUser(message.member)

    let earnedKarma = 0

    let inventoryWorth = 0
    const multi = await getMulti(message.member)

    let inventory = getInventory(message.member)
    const items = getItems()

    let itemIDs = Array.from(Object.keys(inventory))

    for (const item of itemIDs) {
        if (items[item].worth) {
            let fee = 0.5
            if (items[item].emoji == ":coin:") {
                fee = 0.95
            }
            const amount = inventory[item]

            if (items[item].role == "fish" || items[item].role == "prey") {
                const worth1 = Math.floor(items[item].worth * fee * amount)
                inventoryWorth += Math.floor(worth1 + worth1 * multi)
            } else {
                inventoryWorth += Math.floor(items[item].worth * fee * amount)
            }
        } else {
            inventoryWorth += 1000
        }
    }

    earnedKarma += getPrestige(message.member) * 30
    earnedKarma += getXp(message.member) / 100
    earnedKarma += getBalance(message.member) / 100000 / 2
    earnedKarma += inventoryWorth / 100000 / 2

    earnedKarma = Math.floor(earnedKarma * 2.2)

    const embed = new CustomEmbed(
        message.member,
        true,
        "are you sure you want to reset your economy profile?\n\n" +
            `you will lose **everything**, but you will receive ${earnedKarma.toLocaleString()} karma`
    ).setHeader("reset", message.author.avatarURL())

    cooldown.set(message.member.id, new Date())

    const row = new MessageActionRow().addComponents(
        new MessageButton().setCustomId("✅").setLabel("do it.").setStyle("SUCCESS")
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
            embed.setDescription("❌ expired")
            await msg.edit({ embeds: [embed], components: [] })
            cooldown.delete(message.author.id)
        })

    if (reaction == "✅") {
        setTimeout(() => {
            cooldown.delete(message.author.id)
        }, 1800000)
        earnedKarma = 0
        inventoryWorth = 0

        inventory = getInventory(message.member)

        itemIDs = Array.from(Object.keys(inventory))

        for (const item of itemIDs) {
            if (items[item].worth) {
                let fee = 0.5
                if (items[item].emoji == ":coin:") {
                    fee = 0.95
                }
                const amount = inventory[item]

                if (items[item].role == "fish" || items[item].role == "prey") {
                    const worth1 = Math.floor(items[item].worth * fee * amount)
                    inventoryWorth += Math.floor(worth1 + worth1 * multi)
                } else {
                    inventoryWorth += Math.floor(items[item].worth * fee * amount)
                }
            } else {
                inventoryWorth += 1000
            }
        }

        earnedKarma += getPrestige(message.member) * 30
        earnedKarma += getXp(message.member) / 100
        earnedKarma += getBalance(message.member) / 100000 / 2
        earnedKarma += inventoryWorth / 100000 / 2

        earnedKarma = Math.floor(earnedKarma * 2.2)

        addKarma(message.member, earnedKarma)

        deleteUser(message.member)

        embed.setDescription(
            `your economy profile has been reset.\n\nyou have been given **${earnedKarma.toLocaleString()}** karma`
        )

        await msg.edit({ embeds: [embed], components: [] })
    }
}

cmd.setRun(run)

module.exports = cmd
