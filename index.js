const botconfig = require("./botconfig.json");
const Discord = require("discord.js");
const got = require("got");

const bot = new Discord.Client({ disableEveryone: true });

const exf = require("./external_functions")(bot);
var fs = require("fs");
const store = require("nedb");
const db = new store({ filename: "database.db", autoload: true });

const prefix = botconfig.prefix;

bot.on("ready", async () => {
    let prefix = botconfig.prefix;
    console.log(`${bot.user.username} online`);
    bot.user.setActivity(`${prefix}help`);
    console.log("Starting ItemCheck");
    exf.startItemCheck();
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
                `Post's your cs.money shop on the specific channel\n Usage: ${prefix}shop https://cs.money/#sellerid=YOUR_ID (and also attach an image of your shop)`
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
                "csm.report {USER_TO_REPORT} {REASON_MESSAGE}"
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
        if (message.member.roles.find("name", "CS.Money")) {
            var user = message.guild.members.random();
            message.delete(100);
            return message.channel.send(
                `Congrats ${user.user}, you have won our small giveaway!`
            );
        } else {
            message.delete(100);
            return message.channel.send(
                "You are not allowed to use this command."
            );
        }
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
                { json: true }
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
                    { json: true }
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
                { json: true }
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
            { json: true }
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
            db.findOne({ skin: skinName }, function(err, data) {
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
                            { skin: skinName },
                            { skin: skinName, ids: data.ids },
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

    if (cmd === `${prefix}shop`) {
        if (
            !message.member.roles.find(
                "name",
                "Trader" || "Senior Trader" || "Contributor" || "CS.Money"
            )
        )
            return message.reply("You are not allowed to use this command ;)");
        let messageAuthor = message.author.id;
        let authorAvatar = message.author.displayAvatarURL;
        let attachmentArray = message.attachments.array()[0];
        let shopLink = message.content
            .split(" ")
            .slice(1)
            .join(" ");
        console.log("link", shopLink);
        if (!shopLink)
            return message.reply("You did not specify your sellerid.");
        if (!attachmentArray)
            return message.reply("You did not specify your shop image.");
        let embedShop = new Discord.RichEmbed()
            .setDescription(`<@!${messageAuthor}> CS.Money shop`)
            .addField("Link to the shop:", `${shopLink}`)
            .setThumbnail(`${authorAvatar}`)
            .setImage(attachmentArray.url);
        console.log(attachmentArray, shopLink);
        if (!shopLink.match(/https?\:\/\/([\w\d\.]+)?cs\.money\/#sellerid=\d+/))
            return message.reply(
                "Please use correct shop link, for example https://cs.money/#sellerid=YOUR_ID"
            );
        bot.channels.get("581845954567864330").send(embedShop);
        message.delete(200);
    }
});

bot.login(botconfig.token);
