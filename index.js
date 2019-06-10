const botconfig = require("./botconfig.json");
const Discord = require("discord.js");
const got = require("got");
var fs = require("fs");
const store = require("nedb");
const db = new store({filename: "database.db", autoload: true});

const bot = new Discord.Client({disableEveryone: true});
const prefix = botconfig.prefix;

bot.on("ready", async () => {
    console.log(`${bot.user.username} online`);
    bot.user.setActivity("Here to help you!");
    console.log("Starting ItemCheck");
    startItemCheck();
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

    if (cmd === `${prefix}report`) {
        let userReporterId = message.author.id;
        let userMessage = message.content.match(/cs.report(.*)/); // Не забывать менять префикс
        let messageId = message.id;
        let messageTime = message.createdTimestamp;
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
                {json: true}
            ).then(response => {
                let data = response.body;
                if (data.length == 0) {
                    return message.reply("skin not found");
                }
                let highestIndex = 0;
                let highestRate = 0;
                for (var i = 0; i < data.length; i++) {
                    let similarityscore = similarity(skinName, data[i]);
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

                    let embedResponse = getRichEmbed(data, skinName);

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

                    let embedResponse = getRichEmbed(data, skinName);

                    message.reply({
                        embed: embedResponse
                    });
                })
                .catch(error => {
                    return message.reply("skin not found");
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
                let similarityscore = similarity(skinName, data[i]);
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
});

function startItemCheck() {
    db.find({}, function(err, docs) {
        checkItemStatus2(docs);
    });
    setTimeout(function() {
        startItemCheck();
    }, 10 * 60 * 1000);
}

function checkItemStatus() {
    db.find({}, function(err, docs) {
        for (var docIndex in docs) {
            got(
                `https://cs.money/check_skin_status?market_hash_name=${
                    docs[docIndex].skin
                }&appid=730`,
                {json: true}
            )
                .then(response => {
                    let data = response.body;
                    if (data.type == "Tradable") {
                        for (var idIndex in docs[docIndex].ids) {
                            bot.fetchUser(docs[docIndex].ids[idIndex]).then(
                                user =>
                                    user.send(
                                        getRichEmbed(data, docs[docIndex].skin)
                                    )
                            );
                        }
                        db.remove({_id: docs[docIndex]._id}, {}, function(
                            err,
                            numRemoved
                        ) {});
                    }
                })
                .catch(error => {
                    console.log(error);
                });
        }
    });
}

function checkItemStatus2(docs) {
    if (docs.length > 0) {
        currentDoc = docs[0];
        got(
            `https://cs.money/check_skin_status?market_hash_name=${
                currentDoc.skin
            }&appid=730`,
            {json: true}
        )
            .then(response => {
                let data = response.body;
                if (data.type == "Tradable") {
                    for (var idIndex in currentDoc.ids) {
                        bot.fetchUser(currentDoc.ids[idIndex]).then(user =>
                            user.send(getRichEmbed(data, currentDoc.skin))
                        );
                    }
                    db.remove({_id: currentDoc._id}, {}, function(
                        err,
                        numRemoved
                    ) {});
                }
                checkItemStatus2(docs.slice(1));
            })
            .catch(error => {
                console.log(error);
            });
    }
}

function getRichEmbed(data, skinName) {
    if (data.overstock_difference == undefined) {
        let botAvatar = bot.user.displayAvatarURL;

        let embedResponse = new Discord.RichEmbed()
            .setThumbnail(getImageUrlFromName(skinName))
            .setDescription(`Skin Status of ${skinName}`)
            .setColor("#d45f93")
            .addField(
                `Trade status: ${
                    data.type
                } \nUse ${prefix}notify ${skinName} to get notified when the skin is tradeable`,
                `[Get ${skinName} on CS.Money](https://cs.money/?s=float#skin_name_buy=${encodeURIComponent(
                    skinName
                )}${skinName.endsWith(")") ? "" : ")"}`
            );
        return embedResponse;
    } else {
        let botAvatar = bot.user.displayAvatarURL;
        let embedResponse = new Discord.RichEmbed()
            .setThumbnail(getImageUrlFromName(skinName))
            .setDescription(`Skin Status of ${skinName}`)
            .setColor("#d45f93")
            .addField(
                `Trade status: ${data.type} \nAmount till overstock: ${
                    data.overstock_difference
                }`,
                `[Get ${skinName} on CS.Money](https://cs.money/?s=float#skin_name_buy=${encodeURIComponent(
                    skinName
                )}${skinName.endsWith(")") ? "" : ")"}`
            );
        return embedResponse;
    }
}

function getImageUrlFromName(skinName) {
    //Probably better to store in memory
    var skinList = JSON.parse(fs.readFileSync("skinList.json", "utf8"));
    return `https://pic.csgo.trade/730/${skinList[skinName]}.jpg?v=22 `;
}

function similarity(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (
        (longerLength - editDistance(longer, shorter)) /
        parseFloat(longerLength)
    );
}

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
            if (i == 0) costs[j] = j;
            else {
                if (j > 0) {
                    var newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue =
                            Math.min(Math.min(newValue, lastValue), costs[j]) +
                            1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

bot.login(botconfig.token);
