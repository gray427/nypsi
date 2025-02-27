import {
    getBalance,
    createUser,
    updateBalance,
    userExists,
    formatBet,
    getXp,
    updateXp,
    calcMaxBet,
    getMulti,
    addGamble,
    calcEarnedXp,
} from "../utils/economy/utils.js"
import { CommandInteraction, Message } from "discord.js"
import { Command, Categories, NypsiCommandInteraction } from "../utils/models/Command"
import { ErrorEmbed, CustomEmbed } from "../utils/models/EmbedBuilders.js"
import { getPrefix } from "../utils/guilds/utils"
import { isPremium, getTier } from "../utils/premium/utils"
import { gamble } from "../utils/logger.js"

const values = [
    "b",
    "r",
    "b",
    "r",
    "b",
    "r",
    "b",
    "r",
    "b",
    "r",
    "b",
    "r",
    "b",
    "r",
    "b",
    "r",
    "g",
    "b",
    "r",
    "b",
    "r",
    "b",
    "r",
    "b",
    "r",
    "b",
    "r",
    "b",
    "r",
    "b",
    "r",
    "b",
    "r",
    "b",
    "r",
    "b",
    "r",
]

const cooldown = new Map()

const cmd = new Command("roulette", "play roulette", Categories.MONEY).setAliases(["r"])

cmd.slashEnabled = true
cmd.slashData
    .addStringOption((option) =>
        option
            .setName("color")
            .setDescription("color to bet on")
            .setRequired(true)
            .addChoice("🔴 red", "red")
            .addChoice("⚫ black", "black")
            .addChoice("🟢 green", "green")
    )
    .addIntegerOption((option) => option.setName("bet").setDescription("how much would you like to bet").setRequired(true))

/**
 * @param {Message} message
 * @param {Array<String>} args
 */
async function run(message: Message | (NypsiCommandInteraction & CommandInteraction), args: Array<string>) {
    let cooldownLength = 10

    if (isPremium(message.author.id)) {
        if (getTier(message.author.id) == 4) {
            cooldownLength = 3
        } else {
            cooldownLength = 6
        }
    }

    const send = async (data) => {
        if (message.interaction) {
            return await message.reply(data)
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

    if (!userExists(message.member)) createUser(message.member)

    if (args.length == 1 && args[0].toLowerCase() == "odds") {
        return send({
            embeds: [
                new CustomEmbed(
                    message.member,
                    false,
                    "🔴 " +
                        (values.length - 1) / 2 +
                        "/" +
                        values.length +
                        " win **1.5**x\n" +
                        "⚫ " +
                        (values.length - 1) / 2 +
                        "/" +
                        values.length +
                        " win **1.5**x\n" +
                        "🟢 1/" +
                        values.length +
                        " win **17**x"
                ),
            ],
        })
    }

    const prefix = getPrefix(message.guild)

    if (args.length != 2) {
        const embed = new CustomEmbed(message.member)
            .setHeader("roulette help")
            .addField("usage", `${prefix}roulette <colour (**r**ed/**g**reen/**b**lack)> <bet>\n${prefix}roulette odds`)
            .addField(
                "help",
                "this is a bit of a simpler version of real roulette, as in you can only bet on red, black and green which mimics typical csgo roulette\n" +
                    "red and black give a **1.5x** win and green gives a **17**x win"
            )

        return send({ embeds: [embed] })
    }

    if (args[0] != "red" && args[0] != "green" && args[0] != "black" && args[0] != "r" && args[0] != "g" && args[0] != "b") {
        return send({
            embeds: [
                new ErrorEmbed(
                    `${prefix}roulette <colour (**r**ed/**g**reen/**b**lack)> <bet> | ${prefix}**roulette odds** shows the odds of winning`
                ),
            ],
        })
    }

    if (args[0] == "red") {
        args[0] = "r"
    } else if (args[0] == "green") {
        args[0] = "g"
    } else if (args[0] == "black") {
        args[0] = "b"
    }

    const maxBet = calcMaxBet(message.member)

    const bet = formatBet(args[1], message.member)

    if (!bet) {
        return send({ embeds: [new ErrorEmbed("invalid bet")] })
    }

    if (bet <= 0) {
        return send({
            embeds: [
                new ErrorEmbed(
                    `${prefix}roulette <colour (**r**ed/**g**reen/**b**lack)> <bet> | ${prefix}**roulette odds** shows the odds of winning`
                ),
            ],
        })
    }

    if (!bet) {
        return send({
            embeds: [
                new ErrorEmbed(
                    `${prefix}roulette <colour (**r**ed/**g**reen/**b**lack)> <bet> | ${prefix}**roulette odds** shows the odds of winning`
                ),
            ],
        })
    }

    if (bet > getBalance(message.member)) {
        return send({ embeds: [new ErrorEmbed("you cannot afford this bet")] })
    }

    if (bet > maxBet) {
        return send({
            embeds: [
                new ErrorEmbed(
                    `your max bet is $**${maxBet.toLocaleString()}**\nyou can upgrade this by prestiging and voting`
                ),
            ],
        })
    }

    cooldown.set(message.member.id, new Date())

    setTimeout(() => {
        cooldown.delete(message.author.id)
    }, cooldownLength * 1000)

    let colorBet = args[0].toLowerCase()

    updateBalance(message.member, getBalance(message.member) - bet)

    let roll = values[Math.floor(Math.random() * values.length)]

    let win = false
    let winnings = 0

    if (colorBet == roll) {
        win = true
        if (roll == "g") {
            winnings = Math.round(bet * 17)
        } else {
            winnings = Math.round(bet * 1.5)
        }
        updateBalance(message.member, getBalance(message.member) + winnings)
    }

    if (colorBet == "b") {
        colorBet = "⚫"
    }
    if (colorBet == "r") {
        colorBet = "🔴"
    }
    if (colorBet == "g") {
        colorBet = "🟢"
    }

    if (roll == "b") {
        roll = "⚫"
    } else if (roll == "r") {
        roll = "🔴"
    } else if (roll == "g") {
        roll = "🟢"
    }

    let multi = 0

    if (win) {
        multi = getMulti(message.member)

        if (multi > 0) {
            updateBalance(message.member, getBalance(message.member) + Math.round(winnings * multi))
            winnings = winnings + Math.round(winnings * multi)
        }
    }

    const embed = new CustomEmbed(
        message.member,
        true,
        "*spinning wheel..*\n\n**choice** " + colorBet + "\n**your bet** $" + bet.toLocaleString()
    ).setHeader("roulette", message.author.avatarURL())

    const edit = async (data, msg) => {
        if (!(message instanceof Message)) {
            return await message.editReply(data)
        } else {
            return await msg.edit(data)
        }
    }

    send({ embeds: [embed] }).then((m) => {
        embed.setDescription(
            "**landed on** " + roll + "\n\n**choice** " + colorBet + "\n**your bet** $" + bet.toLocaleString()
        )

        if (win) {
            if (multi > 0) {
                embed.addField(
                    "**winner!!**",
                    "**you win** $" +
                        winnings.toLocaleString() +
                        "\n" +
                        "+**" +
                        Math.floor(multi * 100).toString() +
                        "**% bonus"
                )
            } else {
                embed.addField("**winner!!**", "**you win** $" + winnings.toLocaleString())
            }

            const earnedXp = calcEarnedXp(message.member, bet)

            if (earnedXp > 0) {
                updateXp(message.member, getXp(message.member) + earnedXp)
                embed.setFooter(`+${earnedXp}xp`)
            }

            embed.setColor("#5efb8f")
        } else {
            embed.addField("**loser!!**", "**you lost** $" + bet.toLocaleString())
            embed.setColor("#e4334f")
        }

        setTimeout(() => {
            edit({ embeds: [embed] }, m)
        }, 2000)
    })
    gamble(message.author, "roulette", bet, win, winnings)
    addGamble(message.member, "roulette", win)
}

cmd.setRun(run)

module.exports = cmd
