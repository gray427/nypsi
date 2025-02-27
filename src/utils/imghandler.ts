import { logger } from "./logger"
import fetch from "node-fetch"

const pornCache = new Map()
const bdsmCache = new Map()
const boobCache = new Map()
const assCache = new Map()
const thighsCache = new Map()
const birbCache = new Map()
const catCache = new Map()
const dogCache = new Map()
const duckCache = new Map()
const lizardCache = new Map()
const rabbitCache = new Map()
const snekCache = new Map()

const bdsmLinks = [
    "https://www.reddit.com/r/bdsm.json?limit=777",
    "https://www.reddit.com/r/bondage.json?limit=777",
    "https://www.reddit.com/r/dominated.json?limit=777",
]
const thighsLinks = ["https://www.reddit.com/r/legs.json?limit=777", "https://www.reddit.com/r/thickthighs.json?limit=777"]
const boobLinks = [
    "https://www.reddit.com/r/Boobies.json?limit=777",
    "https://www.reddit.com/r/tits.json?limit=777",
    "https://www.reddit.com/r/TinyTits.json?limit=777",
]
const assLinks = [
    "https://www.reddit.com/r/ass.json?limit=777",
    "https://www.reddit.com/r/facedownassup.json?limit=777",
    "https://www.reddit.com/r/assinthong.json?limit=777",
    "https://www.reddit.com/r/buttplug.json?limit=777",
    "https://www.reddit.com/r/TheUnderbun.json?limit=777",
    "https://www.reddit.com/r/booty.json?limit=777",
    "https://www.reddit.com/r/WhiteCheeks.json?limit=777",
    "https://www.reddit.com/r/WomenBendingOver.json?limit=777",
    "https://www.reddit.com/r/thickwhitegirls.json?limit=777",
]
const pornLinks = [
    "https://www.reddit.com/r/collegesluts.json?limit=777",
    "https://www.reddit.com/r/realgirls.json?limit=777",
    "https://www.reddit.com/r/legalteens.json?limit=777",
    "https://www.reddit.com/r/amateur.json?limit=777",
    "https://www.reddit.com/r/gonewild.json?limit=777",
    "https://www.reddit.com/r/gonewild18.json?limit=777",
    "https://www.reddit.com/r/collegeamateurs.json?limit=777",
    "https://www.reddit.com/r/irlgirls.json?limit=777",
    "https://www.reddit.com/r/camwhores.json?limit=777",
    "https://www.reddit.com/r/camsluts.json?limit=777",
    "https://www.reddit.com/r/cumsluts.json?limit=777",
    "https://www.reddit.com/r/cumfetish.json?limit=777",
    "https://www.reddit.com/r/creampies.json?limit=777",
]
const birbLinks = [
    "https://www.reddit.com/r/birb.json?limit=777",
    "https://www.reddit.com/r/budgies.json?limit=777",
    "https://www.reddit.com/r/parrots.json?limit=777",
]
const catLinks = [
    "https://www.reddit.com/r/cat.json?limit=777",
    "https://www.reddit.com/r/catsyawning.json?limit=777",
    "https://www.reddit.com/r/Kitten.json?limit=777",
    "https://www.reddit.com/r/kitty.json?limit=777",
    "https://www.reddit.com/r/catpics.json?limit=777",
]
const dogLinks = [
    "https://www.reddit.com/r/dog.json?limit=777",
    "https://www.reddit.com/r/corgi.json?limit=777",
    "https://www.reddit.com/r/dogpictures.json?limit=777",
    "https://www.reddit.com/r/goldenretrievers.json?limit=777",
    "https://www.reddit.com/r/shiba.json?limit=777",
]
const duckLinks = ["https://www.reddit.com/r/duck.json?limit=777", "https://www.reddit.com/r/BACKYARDDUCKS.json?limit=777"]
const lizardLinks = [
    "https://www.reddit.com/r/Lizards.json?limit=777",
    "https://www.reddit.com/r/BeardedDragons.json?limit=777",
]
const rabbitLinks = ["https://www.reddit.com/r/rabbits.json?limit=777"]
const snekLinks = ["https://www.reddit.com/r/snek.json?limit=777"]

/**
 *
 * @param {Array<String>} links
 * @param {Map} imgs
 * @param {String} name
 */
async function cacheUpdate(links: Array<string>, imgs: Map<string, string>, name: string) {
    const start = new Date().getTime()
    let amount = 0
    for (const link of links) {
        const res = await fetch(link).then((a) => a.json())

        if (res.message == "Forbidden") {
            logger.warn(`skipped ${link} due to private subreddit`)
            continue
        }

        let allowed

        try {
            allowed = res.data.children.filter((post) => !post.data.is_self)
        } catch {
            logger.error(`failed processing ${link}`)
        }

        if (allowed) {
            imgs.set(link, allowed)
            amount += allowed.length
        } else {
            logger.error(`no images @ ${link}`)
        }
    }
    const end = new Date().getTime()
    const total = (end - start) / 1000 + "s"
    logger.log({
        level: "img",
        message: `${amount.toLocaleString()} ${name} images loaded (${total})`,
    })
}

export async function updateCache() {
    const start = new Date().getTime()
    logger.log({
        level: "img",
        message: "img caches updating..",
    })
    await cacheUpdate(bdsmLinks, bdsmCache, "bdsm")
    exports.bdsmCache = bdsmCache
    await cacheUpdate(thighsLinks, thighsCache, "thighs")
    exports.thighsCache = thighsCache
    await cacheUpdate(boobLinks, boobCache, "boob")
    exports.boobCache = boobCache
    await cacheUpdate(assLinks, assCache, "ass")
    exports.assCache = assCache
    await cacheUpdate(pornLinks, pornCache, "porn")
    exports.pornCache = pornCache
    await cacheUpdate(birbLinks, birbCache, "birb")
    exports.birbCache = birbCache
    await cacheUpdate(catLinks, catCache, "cat")
    exports.catCache = catCache
    await cacheUpdate(dogLinks, dogCache, "dog")
    exports.dogCache = dogCache
    await cacheUpdate(duckLinks, duckCache, "duck")
    exports.duckCache = duckCache
    await cacheUpdate(lizardLinks, lizardCache, "lizard")
    exports.lizardCache = lizardCache
    await cacheUpdate(rabbitLinks, rabbitCache, "rabbit")
    exports.rabbitCache = rabbitCache
    await cacheUpdate(snekLinks, snekCache, "snek")
    exports.snekCache = snekCache
    const end = new Date().getTime()
    const total = (end - start) / 1000 + "s"
    logger.log({
        level: "img",
        message: "images updated (" + total + ")",
    })
}
