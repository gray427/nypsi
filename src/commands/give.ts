import { CommandInteraction, Message } from "discord.js"
import { Command, Categories, NypsiCommandInteraction } from "../utils/models/Command"
import { ErrorEmbed, CustomEmbed } from "../utils/models/EmbedBuilders"
import {
    isEcoBanned,
    userExists,
    createUser,
    getItems,
    getInventory,
    getMaxBitcoin,
    getMaxEthereum,
    getPrestige,
    getXp,
    setInventory,
} from "../utils/economy/utils"
import { getPrefix } from "../utils/guilds/utils"
import { payment } from "../utils/logger"
import { isPremium, getTier } from "../utils/premium/utils"
import { getMember } from "../utils/functions/member"

const cmd = new Command("give", "give other users items from your inventory", Categories.MONEY)

const cooldown = new Map()

/**
 * @param {Message} message
 * @param {Array<String>} args
 */
async function run(message: Message | (NypsiCommandInteraction & CommandInteraction), args: Array<string>) {
    let cooldownLength = 15

    if (isPremium(message.author.id)) {
        if (getTier(message.author.id) == 4) {
            cooldownLength = 5
        }
    }

    if (cooldown.has(message.member.id)) {
        const init = cooldown.get(message.member.id)
        const curr = new Date()
        const diff = Math.round((curr.getTime() - init) / 1000)
        const time = cooldownLength - diff

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
        const embed = new CustomEmbed(message.member, false).setHeader("give", message.author.avatarURL())

        embed.addField("usage", `${getPrefix(message.guild)}give <member> <item> (amount)`)
        embed.addField("help", "give members items from your inventory")

        return message.channel.send({ embeds: [embed] })
    }

    let target = message.mentions.members.first()

    if (!target) {
        target = await getMember(message.guild, args[0])
    }

    if (!target) {
        return message.channel.send({ embeds: [new ErrorEmbed("invalid user")] })
    }

    if (message.member == target) {
        return message.channel.send({ embeds: [new ErrorEmbed("invalid user")] })
    }

    if (target.user.bot) {
        return message.channel.send({ embeds: [new ErrorEmbed("invalid user")] })
    }

    if (isEcoBanned(target.user.id)) {
        return message.channel.send({ embeds: [new ErrorEmbed("invalid user")] })
    }

    if (!userExists(target)) createUser(target)

    if (!userExists(message.member)) createUser(message.member)

    const items = getItems()
    const inventory = getInventory(message.member)
    const targetInventory = getInventory(target)

    let searchTag

    try {
        searchTag = args[1].toLowerCase()
    } catch {
        const embed = new CustomEmbed(message.member, false).setHeader("give", message.author.avatarURL())

        embed.addField("usage", `${getPrefix(message.guild)}give <member> <item> (amount)`)
        embed.addField("help", "give members items from your inventory")

        return message.channel.send({ embeds: [embed] })
    }

    let selected

    for (const itemName of Array.from(Object.keys(items))) {
        const aliases = items[itemName].aliases ? items[itemName].aliases : []
        if (searchTag == itemName) {
            selected = itemName
            break
        } else if (searchTag == itemName.split("_").join("")) {
            selected = itemName
            break
        } else if (aliases.indexOf(searchTag) != -1) {
            selected = itemName
            break
        }
    }

    selected = items[selected]

    if (!selected) {
        return message.channel.send({ embeds: [new ErrorEmbed(`couldnt find \`${args[1]}\``)] })
    }

    if (!inventory[selected.id] || inventory[selected.id] == 0) {
        return message.channel.send({ embeds: [new ErrorEmbed("you dont have any " + selected.name)] })
    }

    if (parseInt(args[2]) > 50) args[2] = "50"

    let amount = parseInt(args[2])

    if (!args[2]) {
        amount = 1
    } else {
        if (amount <= 0) {
            return message.channel.send({ embeds: [new ErrorEmbed("invalid amount")] })
        }

        if (amount > inventory[selected.id]) {
            return message.channel.send({ embeds: [new ErrorEmbed(`you don't have enough ${selected.name}`)] })
        }
    }

    if (!amount) {
        return message.channel.send({ embeds: [new ErrorEmbed("invalid amount")] })
    }

    if (selected.id == "bitcoin") {
        const owned = targetInventory["bitcoin"] || 0
        const max = getMaxBitcoin(target)

        if (owned + amount > max) {
            return message.channel.send({
                embeds: [new ErrorEmbed("you cannot give this person that much bitcoin")],
            })
        }
    } else if (selected.id == "ethereum") {
        const owned = targetInventory["ethereum"] || 0
        const max = getMaxEthereum(target)

        if (owned + amount > max) {
            return message.channel.send({
                embeds: [new ErrorEmbed("you cannot give this person that much ethereum")],
            })
        }
    }

    const targetPrestige = getPrestige(target)

    if (targetPrestige < 2) {
        const targetXp = getXp(target)

        let payLimit = 150000

        let xpBonus = targetXp * 2500

        if (xpBonus > 1000000) xpBonus = 200000

        payLimit += xpBonus

        const prestigeBonus = targetPrestige * 100000

        payLimit += prestigeBonus

        if (amount > payLimit) {
            return message.channel.send({ embeds: [new ErrorEmbed("you can't pay this user that much yet")] })
        }
    }

    cooldown.set(message.member.id, new Date())

    setTimeout(() => {
        cooldown.delete(message.author.id)
    }, cooldownLength * 1000)

    inventory[selected.id] -= amount

    if (inventory[selected.id] <= 0) {
        delete inventory[selected.id]
    }

    if (targetInventory[selected.id]) {
        targetInventory[selected.id] += amount
    } else {
        targetInventory[selected.id] = amount
    }

    setInventory(message.member, inventory)
    setInventory(target, targetInventory)

    payment(message.author, target.user, selected.worth * amount)

    if (selected.id == "ring") {
        return message.channel.send({
            embeds: [new CustomEmbed(message.member, false, "you may now kiss the bride :heart:")],
        })
    }

    return message.channel.send({
        embeds: [
            new CustomEmbed(
                message.member,
                false,
                `you have given **${amount}** ${selected.emoji} ${selected.name} to **${target.toString()}**`
            ),
        ],
    })
}

cmd.setRun(run)

module.exports = cmd
