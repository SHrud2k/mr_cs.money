const botconfig = require("./botconfig.json");
const Discord = require("discord.js");

const bot = new Discord.Client({disableEveryone: true});

bot.on("ready", async () => {
    console.log(`${bot.user.username} online`);
    bot.user.setActivity("csm.help");
});

bot.on("message", async message => {
    if(message.author.bot) return;
    if(message.channel.type === "dm") return;

    let prefix = botconfig.prefix;
    let messageArray = message.content.split(" ");
    let cmd = messageArray[0];
    let args = messageArray.slice(1);

    if(cmd === `${prefix}help`){
        let botAvatar = bot.user.displayAvatarURL;
        let embedMessage = new Discord.RichEmbed()
        .setDescription("Bot usage commands.")
        .addField("csm.","Prefix to use our bot.")
        .addField("csm.info","Small info about the bot and server")
        .addField("csm.report","Report a user, that violates our server rules: \ncsm.report @User_to_report 'report_reason'")
        .setColor("#d45f93")
        .setThumbnail(botAvatar)
        return message.channel.send(embedMessage);
    }

    if(cmd === `${prefix}info`){
        let botAvatar = bot.user.displayAvatarURL;
        let botembed = new Discord.RichEmbed()
        .setDescription("Bot usage Information")
        .setColor("#d45f93")
        .setThumbnail(botAvatar)
        .addField("Hello, my name is "+ bot.user.username + ", I am here to help you, please be aware that I am still learning to do stuff ;)", "CS.MONEY Developer Team");
        
        return message.channel.send(botembed);
    }

    if(cmd === `${prefix}report`){
        let userReporterId = message.author.id;
        let userMessage = message.content.match(/csm.report(.*)/);
        let messageId = message.id;
        let messageTime = message.createdTimestamp;
        console.log(messageTime);
        let embedMessage = new Discord.RichEmbed()
        .setDescription("Wrong parametres!")
        .addField("Please try again, with this example:","csm.report {USER_TO_REPORT} {REASON_MESSAGE}");
        if(userMessage){
            const content = userMessage[1].trim().replace(/\s{2,}/g," ");
            const [userId] = content.split(" ");
            const reportReason = content.split(" ").slice(1).join(" ");
            console.log(userId)
            if (!userId || !reportReason) {
                return (message.reply(embedMessage));
            }
            message.channel.send("Report for "+userId+" was sent successfully\nReport reason is **"+reportReason+"**");
            bot.channels.get("581891514163134474").send("Report for: "+userId+"\nReport from: <@!"+userReporterId+">\nReport reason: "+reportReason+"\nReport message Id: "+messageId);
            message.delete(5000);
        }
    }

    if(message.isMentioned(message.guild.roles.find(role => role.name === "Support"))) {
        let botAvatar = bot.user.displayAvatarURL;
        let embedResponse = new Discord.RichEmbed()
        .setThumbnail(botAvatar)
        .setDescription("Q: Where can i find support on the site?")
        .setColor("#d45f93")
        .addField("A: To find our site's support please navigate to the bottom right part of the site.\nThere you can get all the help you need 24/7, 365 days a year.", "Yours CS.MONEY Support Team")

        return message.reply({
            embed: embedResponse,
            files: ["./support_placement.png"],
        })
    }
});

bot.login(botconfig.token);