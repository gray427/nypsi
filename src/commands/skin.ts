import { CommandInteraction, Message } from "discord.js"
import fetch from "node-fetch"
import { getPrefix } from "../utils/guilds/utils"
import { isPremium, getTier } from "../utils/premium/utils"
import { Command, Categories, NypsiCommandInteraction } from "../utils/models/Command"
import { ErrorEmbed, CustomEmbed } from "../utils/models/EmbedBuilders.js"
import { getSkin } from "mc-names"

const cooldown = new Map()

const cmd = new Command("skin", "view the skin of a minecraft account", Categories.MINECRAFT)

/**
 * @param {Message} message
 * @param {Array<String>} args
 */
async function run(message: Message | (NypsiCommandInteraction & CommandInteraction), args: Array<string>) {
    const prefix = getPrefix(message.guild)

    if (args.length == 0) {
        return message.channel.send({ embeds: [new ErrorEmbed(`${prefix}skin <account>`)] })
    }

    let cooldownLength = 10

    if (isPremium(message.author.id)) {
        if (getTier(message.author.id) == 4) {
            cooldownLength = 2
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

    cooldown.set(message.member.id, new Date())

    setTimeout(() => {
        cooldown.delete(message.author.id)
    }, cooldownLength * 1000)

    const username = args[0]

    const uuidURL = "https://api.mojang.com/users/profiles/minecraft/" + username
    let uuid

    try {
        uuid = await fetch(uuidURL).then((uuidURL) => uuidURL.json())
    } catch (e) {
        return message.channel.send({ embeds: [new ErrorEmbed("invalid account")] })
    }

    const skin = await getSkin(username)

    const embed = new CustomEmbed(message.member, false, `[download](https://mc-heads.net/download/${uuid.id})`)
        .setTitle(uuid.name)
        .setURL("https://namemc.com/profile/" + username)
        .setImage(skin.render)

    return message.channel.send({ embeds: [embed] })
}

cmd.setRun(run)

module.exports = cmd
