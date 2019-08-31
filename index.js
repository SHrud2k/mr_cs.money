const botconfig = require("./botconfig.json");
const Discord = require("discord.js");
const got = require("got");
const bot = new Discord.Client({disableEveryone: true});
var fs = require("fs");
const store = require("nedb");
const puppeteer = require("puppeteer");
const db = new store({filename: "./database.db", autoload: true});

const exf = require("./external_functions")(bot, db);
const prefix = botconfig.prefix;
const sellerScreenshotsDir = "./sellerScreenshots";

bot.on("ready", async () => {
    let prefix = botconfig.prefix;
    console.log(`${bot.user.username} online`);
    bot.user.setActivity(`${prefix}help`);
    console.log("Starting ItemCheck");
    exf.startItemCheck();
    //Use at own risk
    //exf.lotCheck();
});

bot.on("message", async message => {
    if (message.author.bot) return;
    if (message.channel.type === "dm") return;

    let messageArray = message.content.split(" ");
    let cmd = messageArray[0];
    let args = messageArray.slice(1);

    if (cmd === `${prefix}help`) {
        let botAvatar = bot.user.displayAvatarURL;
        let embedMessage = new Discord.RichEmbed()
            .setDescription(
                "Be aware that some of the commands can only be used in channel dedicated for the bot."
            )
            .addField(`${prefix}`, "Prefix to use our bot.")
            .addField(`${prefix}info`, "Small info about the bot and server")
            .addField(
                `${prefix}report`,
                `Report a user, that violates our server rules: \n${prefix}report @User_to_report 'report_reason'`
            )
            .addField(
                `${prefix}status`,
                `Check for the overstock status of your favorite skin\nUsage: ${prefix}status STATTRACK_STATUS FULL_NAME CONDITION\nFor example: ${prefix}status stat ak-47 redline minimal wear`
            )
            .addField(
                `${prefix}shop`,
                `Post's your cs.money shop on the specific channel\n Usage: ${prefix}shop https://cs.money/#sellerid=YOUR_ID`
            )
            .addField(
                `${prefix}notify`,
                "Want to be notified when your favourite skin will get out of overstock? You can by executing this command."
            )
            .addField(
                `${prefix}online`,
                "Check the status of the website services"
            )
            .setColor("#d45f93")
            .setThumbnail(botAvatar);
        return message.channel.send(embedMessage);
    }

    if (cmd === `${prefix}info`) {
        let botAvatar = bot.user.displayAvatarURL;
        let botembed = new Discord.RichEmbed()
            .setDescription("Bot usage Information")
            .setColor("#d45f93")
            .setThumbnail(botAvatar)
            .addField(
                "Hello, my name is " +
                    bot.user.username +
                    ", I am here to help you, please be aware that I am still learning to do stuff ;)",
                "CS.MONEY Developer Team"
            );

        return message.channel.send(botembed);
    }

    if (cmd === `${prefix}report`) {
        let userReporterId = message.author.id;
        let userMessage = message.content.match(/cs.report(.*)/); // Не забывать менять префикс
        let messageId = message.id;
        let embedMessage = new Discord.RichEmbed()
            .setDescription("Wrong parametres!")
            .addField(
                "Please try again, with this example:",
                "cs.report {USER_TO_REPORT} {REASON_MESSAGE}"
            );
        if (userMessage) {
            const content = userMessage[1].trim().replace(/\s{2,}/g, " ");
            const [userId] = content.split(" ");
            const reportReason = content
                .split(" ")
                .slice(1)
                .join(" ");
            if (!userId || !reportReason) {
                return message.reply(embedMessage);
            }
            message.channel.send(
                "Report for " +
                    userId +
                    " was sent successfully\nReport reason is **" +
                    reportReason +
                    "**"
            );
            bot.channels
                .find("name", "reports")
                .send(
                    "Report for: " +
                        userId +
                        "\nReport from: <@!" +
                        userReporterId +
                        ">\nReport reason: " +
                        reportReason +
                        "\nReport message Id: " +
                        messageId
                );
            message.delete(5000);
        }
    }

    if (cmd === `${prefix}userroll`) {
        if (!message.member.roles.find("name", "CS.Money"))
            return message.channel.send(
                "You are not allowed to use this command."
            );

        var user = message.guild.members.filter(
            online => online.presence.status === "online"
        );
        //console.log(user);
        let winner = user.random();
        while (!winner.lastMessage && winner.roles.find("name", "CS.Money")) {
            winner = user.random();
        }

        // if (user.user.bot) {
        //     message.channel.send("Whops, that was a bot");
        //     message.delete(1000);
        //     return;
        // }
        message.channel.send(
            `Congrats ${winner}, you have won our small giveaway!`
        );
        message.delete(1000);
    }

    if (cmd === `${prefix}status`) {
        if (message.channel.name != "mr-csmoney")
            return message.reply(
                "This command can only be used in bot's channel."
            );
        let skinName = args.join(" ");
        message.delete();
        if (
            !(
                skinName.includes("|") &&
                skinName.includes("(") &&
                skinName.includes(")")
            )
        ) {
            got(
                `https://cs.money/get_auto_complete?part_name=${encodeURIComponent(
                    skinName
                )}&appid=730`,
                {json: true}
            ).then(response => {
                let data = response.body;
                if (data.length == 0) {
                    return message.reply("skin not found");
                }
                let highestIndex = 0;
                let highestRate = 0;
                for (var i = 0; i < data.length; i++) {
                    let similarityscore = exf.similarity(skinName, data[i]);
                    if (similarityscore > highestRate) {
                        highestRate = similarityscore;
                        highestIndex = i;
                    }
                }
                skinName = data[highestIndex];
                got(
                    `https://cs.money/check_skin_status?market_hash_name=${encodeURIComponent(
                        skinName
                    )}&appid=730`,
                    {json: true}
                ).then(response => {
                    let data = response.body;

                    let embedResponse = exf.getRichEmbed(data, skinName);

                    message.reply({
                        embed: embedResponse
                    });
                });
            });
        } else {
            got(
                `https://cs.money/check_skin_status?market_hash_name=${encodeURIComponent(
                    skinName
                )}&appid=730`,
                {json: true}
            )
                .then(response => {
                    let data = response.body;

                    let embedResponse = exf.getRichEmbed(data, skinName);

                    message.reply({
                        embed: embedResponse
                    });
                })
                .catch(error => {
                    return message.reply("Skin not found");
                });
        }
    }

    if (cmd === `${prefix}notify`) {
        //MAYBE CHECK IF IS UNTRADEABLE
        let authorid = message.author.id;
        let skinName = args.join(" ");
        message.delete();
        got(
            `https://cs.money/get_auto_complete?part_name=${encodeURIComponent(
                skinName
            )}&appid=730`,
            {json: true}
        ).then(response => {
            let data = response.body;
            if (data.length == 0) {
                return message.reply("skin not found");
            }
            let highestIndex = 0;
            let highestRate = 0;
            for (var i = 0; i < data.length; i++) {
                let similarityscore = exf.similarity(skinName, data[i]);
                if (similarityscore > highestRate) {
                    highestRate = similarityscore;
                    highestIndex = i;
                }
            }
            skinName = data[highestIndex];
            db.findOne({skin: skinName}, function(err, data) {
                if (data == null) {
                    data = {
                        skin: skinName,
                        ids: [authorid]
                    };
                    db.insert(data);
                } else {
                    if (!data.ids.includes(authorid)) {
                        data.ids.push(authorid);
                        db.update(
                            {skin: skinName},
                            {skin: skinName, ids: data.ids},
                            {},
                            function(err, numReplaced) {}
                        );
                    }
                }
            });
        });
    }

    if (
        message.isMentioned(
            message.guild.roles.find(role => role.name === "Support")
        )
    ) {
        let botAvatar = bot.user.displayAvatarURL;
        let embedResponse = new Discord.RichEmbed()
            .setThumbnail(botAvatar)
            .setDescription("Q: Where can i find support on the site?")
            .setColor("#d45f93")
            .addField(
                "A: To find our site's support please navigate to the bottom right part of the site.\nThere you can get all the help you need 24/7, 365 days a year.",
                "Yours CS.MONEY Support Team"
            );

        return message.reply({
            embed: embedResponse,
            files: ["./support_placement.png"]
        });
    }

    if (cmd === `${prefix}online`) {
        got(`https://cs.money/`)
            .then(response => {
                let data = response.body;
                var ex = new RegExp('"work_statuses":{([^}]+)}');
                var exres = data
                    .match(ex)[0]
                    .replace('"work_statuses":', "[")
                    .concat("]");
                var json = JSON.parse(exres)[0];

                const payment = [
                    "disable_g2a",
                    "disable_paymaster",
                    "disable_qiwi",
                    "disable_walletone",
                    "disable_tinkoff"
                ];
                var paymentcount = 5;
                for (var i = 0; i < payment.length; i++) {
                    if (json[payment[i]]) {
                        paymentcount--;
                    }
                }
                const trading = [
                    "disable_deposit",
                    "disable_withdraw",
                    "disable_sell"
                ];
                var tradingcount = 3;
                for (var i = 0; i < trading.length; i++) {
                    if (json[trading[i]]) {
                        tradingcount--;
                    }
                }
                let misc = ["fuckup", "steam_problems"];
                var misccount = 2;
                for (var i = 0; i < misc.length; i++) {
                    if (json[misc[i]]) {
                        misccount--;
                    }
                }
                let embedResponse = new Discord.RichEmbed()
                    .setColor("#d45f93")
                    .setThumbnail(bot.user.displayAvatarURL)
                    .setTitle("CS.Money service overview")
                    .addField(
                        "Maintenance",
                        json["maintenance"]
                            ? `Currently under maintenance`
                            : `Currently not under maintenance`
                    )
                    .addField(
                        "Payment (" + paymentcount + "/5)",
                        paymentcount == 5
                            ? `All payment services are running ✔️`
                            : `Not all services are running ❌`
                    )
                    .addField(
                        "Trading (" + tradingcount + "/3)",
                        tradingcount == 3
                            ? `All trading services are running ✔️`
                            : `Not all services are running ❌`
                    )
                    .addField(
                        "Other (" + misccount + "/2)",
                        misccount == 2
                            ? `All other services are running ✔️`
                            : `Not all services are running ❌`
                    );
                message.reply(embedResponse);
            })
            .catch(error => {
                console.log(error);
                message.reply("Error while getting Website status");
            });
    }

    if (cmd === `${prefix}stats`) {
        got(`https://cs.money/`)
            .then(response => {
                let data = response.body;
                //[{"new_users_per_day":6224,"total_count_offers":67681385,"total_count_users":4695918,"user_online":"4289","array_offers_stats":[67681299,67681306,67681312,67681314,67681319,67681327,67681348,67681357,67681372,67681379,67681385]}]
                var ex = new RegExp('"list_stats":{([^}]+)}');
                var exres = data
                    .match(ex)[0]
                    .replace('"list_stats":', "[")
                    .concat("]");
                var json = JSON.parse(exres)[0];

                let embedResponse = new Discord.RichEmbed()
                    .setColor("#d45f93")
                    .setThumbnail(bot.user.displayAvatarURL)
                    .setTitle("CS.Money stats overview")
                    .addField(
                        "User statistics",
                        `Online users: ${json[`user_online`]}\nUnique users: ${
                            json[`total_count_users`]
                        }\nNew users today: ${json[`new_users_per_day`]}`
                    )
                    .addField(
                        "Trade statistics",
                        `Succesfull trades: ${
                            json[`total_count_offers`]
                        }\nTrades in the last 5 seconds: ${json[
                            `array_offers_stats`
                        ][10] - json[`array_offers_stats`][9]}`
                    );

                /*.addField(json[`user_online`], "ONLINE USERS", true)
                    .addField(
                        json[`array_offers_stats`][10] -
                            json[`array_offers_stats`][9],
                        "TRADES IN THE LAST 5 SECONDS",
                        true
                    )
                    .addField(json[`total_count_users`], "LOYAL USERS", true)
                    .addField(
                        json[`total_count_offers`],
                        "SUCCESFUL TRADES",
                        true
                    )
                    .addField(
                        json[`new_users_per_day`],
                        "NEW USERS TODAY",
                        true
                    );*/

                message.reply(embedResponse);
            })
            .catch(error => {
                console.log(error);
                message.reply("Error while getting Website status");
            });
    }

    if (cmd === `${prefix}shop`) {
        if (
            !message.member.roles.some(role => {
                return [
                    "Trader",
                    "Senior Trader",
                    "Contributor",
                    "CS.Money"
                ].includes(role.name);
            })
        )
            return message.reply("You are not allowed to use this command ;)");
        let messageAuthor = message.author.id;
        let authorAvatar = message.author.displayAvatarURL;
        let shopLink = message.content
            .split(" ")
            .slice(1)
            .join(" ");
        if (!shopLink)
            return message.reply("You did not specify your sellerid.");
        if (!shopLink.match(/https?\:\/\/([\w\d\.]+)?cs\.money\/#sellerid=\d+/))
            return message.reply(
                "Please use correct shop link, for example https://cs.money/#sellerid=YOUR_ID"
            );

        (async () => {
            const browser = await puppeteer.launch();
            const page = await browser.newPage();
            page.setViewport({width: 4000, height: 1080, deviceScaleFactor: 2});

            await page.goto(shopLink, {
                waitUntil: "networkidle2"
            });

            await page.waitForSelector(
                "#main_container_bot[state=filled]" ||
                    "#main_container_user[state=filled]"
            );

            async function screenshotDOMElement(selector, padding = 0) {
                const rect = await page.evaluate(selector => {
                    const element = document.querySelector(selector);
                    const {
                        x,
                        y,
                        width,
                        height
                    } = element.getBoundingClientRect();
                    return {left: x, top: y, width, height, id: element.id};
                }, selector);

                return await page.screenshot({
                    path: `${sellerScreenshotsDir}/${
                        shopLink.split("=")[1]
                    }.png`,
                    clip: {
                        x: rect.left - padding,
                        y: rect.top - padding,
                        width: rect.width + padding * 2,
                        height: Math.min(rect.height + padding * 2, 585)
                    }
                });
            }

            setTimeout(async function() {
                await screenshotDOMElement("#main_container_bot", 16);
                const attachment = new Discord.Attachment(
                    `${sellerScreenshotsDir}/${shopLink.split("=")[1]}.png`,
                    `${shopLink.split("=")[1]}.png`
                );
                let embedShop = new Discord.RichEmbed()
                    .setDescription(`<@!${messageAuthor}> CS.Money shop`)
                    .addField("Link to the shop:", `${shopLink}`)
                    .setThumbnail(`${authorAvatar}`)
                    .attachFile(attachment)
                    .setImage(`attachment://${shopLink.split("=")[1]}.png`);
                bot.channels
                    .find("name", "🔄sellerid-showcase")
                    .send(embedShop);
                message.delete(200);
            }, 1000 * 2);
        })();
    }
});

if (!fs.existsSync(sellerScreenshotsDir)) {
    fs.mkdirSync(sellerScreenshotsDir);
}

bot.login(botconfig.token);
