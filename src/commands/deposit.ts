import {
    getBalance,
    getBankBalance,
    getMaxBankBalance,
    updateBalance,
    updateBankBalance,
    userExists,
    createUser,
    formatNumber,
} from "../utils/economy/utils.js"
import { CommandInteraction, Message } from "discord.js"
import { Command, Categories, NypsiCommandInteraction } from "../utils/models/Command"
import { ErrorEmbed, CustomEmbed } from "../utils/models/EmbedBuilders.js"
import { getPrefix } from "../utils/guilds/utils"
import { isPremium, getTier } from "../utils/premium/utils"

const cooldown = new Map()

const cmd = new Command("deposit", "deposit money into your bank", Categories.MONEY).setAliases(["dep"])

cmd.slashEnabled = true
cmd.slashData.addIntegerOption((option) => option.setName("amount").setDescription("amount to deposit").setRequired(true))

/**
 * @param {Message} message
 * @param {Array<String>} args
 */
async function run(message: Message | (NypsiCommandInteraction & CommandInteraction), args: Array<string>) {
    if (!userExists(message.member)) createUser(message.member)

    let cooldownLength = 30

    if (isPremium(message.author.id)) {
        if (getTier(message.author.id) == 4) {
            cooldownLength = 10
        }
    }

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

        return send({ embeds: [new ErrorEmbed(`still on cooldown for \`${remaining}\``)] })
    }

    const prefix = getPrefix(message.guild)

    if (args.length == 0) {
        const embed = new CustomEmbed(message.member, false)
            .setHeader("deposit help")
            .addField("usage", `${prefix}deposit <amount>`)
            .addField(
                "help",
                "you can deposit money into your bank to keep it safe from robberies (and gambling if you have *issues*)\n" +
                    "however there is a limit to the size of your bank account, when starting, your bank has a capacity of $**15,000**, but will upgrade as your use the bot more."
            )
        return send({ embeds: [embed] })
    }

    if (args[0].toLowerCase() == "all") {
        args[0] = getBalance(message.member).toString()
        const amount = parseInt(args[0])
        if (amount > getMaxBankBalance(message.member) - getBankBalance(message.member)) {
            args[0] = (getMaxBankBalance(message.member) - getBankBalance(message.member)).toString()
        }
    }

    if (args[0] == "half") {
        args[0] = (getBankBalance(message.member) / 2).toString()
    }

    const amount = formatNumber(args[0])

    if (!amount || isNaN(amount)) {
        return send({ embeds: [new ErrorEmbed("invalid amount")] })
    }

    if (amount > getBalance(message.member)) {
        return send({ embeds: [new ErrorEmbed("you cannot afford this payment")] })
    }

    if (amount > getMaxBankBalance(message.member) - getBankBalance(message.member)) {
        return send({ embeds: [new ErrorEmbed("your bank is not big enough for this payment")] })
    }

    if (amount <= 0) {
        return send({ embeds: [new ErrorEmbed("invalid payment")] })
    }

    cooldown.set(message.member.id, new Date())

    setTimeout(() => {
        cooldown.delete(message.author.id)
    }, cooldownLength * 1000)

    const embed = new CustomEmbed(message.member, false)
        .setHeader("bank deposit", message.author.avatarURL())
        .addField(
            "bank balance",
            "$**" +
                getBankBalance(message.member).toLocaleString() +
                "** / $**" +
                getMaxBankBalance(message.member).toLocaleString() +
                "**"
        )
        .addField("transaction amount", "+$**" + amount.toLocaleString() + "**")

    const m = await send({ embeds: [embed] })

    updateBalance(message.member, getBalance(message.member) - amount)
    updateBankBalance(message.member, getBankBalance(message.member) + amount)

    const embed1 = new CustomEmbed(message.member, false)
        .setHeader("bank deposit", message.author.avatarURL())
        .addField(
            "bank balance",
            "$**" +
                getBankBalance(message.member).toLocaleString() +
                "** / $**" +
                getMaxBankBalance(message.member).toLocaleString() +
                "**"
        )
        .addField("transaction amount", "+$**" + amount.toLocaleString() + "**")

    const edit = async (data, msg) => {
        if (!(message instanceof Message)) {
            await message.editReply(data)
            return await message.fetchReply()
        } else {
            return await msg.edit(data)
        }
    }

    setTimeout(() => edit({ embeds: [embed1] }, m), 1500)
}

cmd.setRun(run)

module.exports = cmd
