const botconfig = require("./botconfig.json");
const Discord = require("discord.js");
const got = require("got");
const similarity = require("./external_functions");

const bot = new Discord.Client({ disableEveryone: true });

bot.on("ready", async () => {
    let prefix = botconfig.prefix;
    console.log(`${bot.user.username} online`);
    bot.user.setActivity(`${prefix}help`);
});

bot.on("message", async message => {
    if (message.author.bot) return;
    if (message.channel.type === "dm") return;

    let prefix = botconfig.prefix;
    let messageArray = message.content.split(" ");
    let cmd = messageArray[0];
    let args = messageArray.slice(1);

    if (cmd === `${prefix}help`) {
        let botAvatar = bot.user.displayAvatarURL;
        let embedMessage = new Discord.RichEmbed()
            .setDescription("Bot usage commands.")
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
                .get("581891514163134474")
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
                `https://cs.money/get_auto_complete?part_name=${encodeURI(
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
                    let similarityscore = similarity(skinName, data[i]);
                    if (similarityscore > highestRate) {
                        highestRate = similarityscore;
                        highestIndex = i;
                    }
                }
                skinName = encodeURI(data[highestIndex]);
                got(
                    `https://cs.money/check_skin_status?market_hash_name=${skinName}&appid=730`,
                    { json: true }
                ).then(response => {
                    let data = response.body;

                    let botAvatar = bot.user.displayAvatarURL;
                    let embedResponse = new Discord.RichEmbed()
                        .setThumbnail(botAvatar)
                        .setDescription(`Skin Status of ${decodeURI(skinName)}`)
                        .setColor("#d45f93")
                        .addField(
                            `Trade status: ${
                                data.type
                            } \nAmount till overstock: ${
                                data.overstock_difference
                            }`,
                            `[Get ${decodeURI(
                                skinName
                            )} on CS.Money](https://cs.money/?s=float#skin_name_buy=${skinName}`
                        );
                    console.log(skinName);

                    message.reply({
                        embed: embedResponse
                    });
                });
            });
        } else {
            skinName = encodeURI(skinName);
            got(
                `https://cs.money/check_skin_status?market_hash_name=${skinName}&appid=730`,
                { json: true }
            )
                .then(response => {
                    let data = response.body;

                    let botAvatar = bot.user.displayAvatarURL;
                    let embedResponse = new Discord.RichEmbed()
                        .setThumbnail(botAvatar)
                        .setDescription(`Skin Status of ${decodeURI(skinName)}`)
                        .setColor("#d45f93")
                        .addField(
                            `Trade status: ${
                                data.type
                            } \nAmount till overstock: ${
                                data.overstock_difference
                            }`,
                            `[Get ${decodeURI(
                                skinName
                            )} on CS.Money](https://cs.money/?s=float#skin_name_buy=${skinName}`
                        );

                    message.reply({
                        embed: embedResponse
                    });
                })
                .catch(error => {
                    return message.reply("skin not found");
                });
        }
    }
});

bot.login(botconfig.token);
