const botconfig = require("./botconfig.json");
const Discord = require("discord.js");

const bot = new Discord.Client({disableEveryone: true});

bot.on("ready", async () => {
    console.log(`${bot.user.username} online`);
    bot.user.setActivity("Here to help you!");
});

bot.on("message", async message => {
    if(message.author.bot) return;
    if(message.channel.type === "dm") return;

    let prefix = botconfig.prefix;
    let messageArray = message.content.split(" ");
    let cmd = messageArray[0];
    let args = messageArray.slice(1);

    if(cmd === `${prefix}help`){
        return message.channel.send("Under construction");
    }

    if(cmd === `${prefix}info`){
        let botAvatar = bot.user.displayAvatarURL;
        let botembed = new Discord.RichEmbed()
        .setDescription("Bot usage Information")
        .setColor("#d45f93")
        .setThumbnail(botAvatar)
        .addField(`Hello, my name is ${bot.user.username}, I am here to help you, please be aware that I am still learning to do stuff ;)`, "CS.MONEY Developer Team");
        
        return message.channel.send(botembed);
    }

    if(cmd === `${prefix}report`){
        let userReporterId = message.author.id;
        let messageId = message.id;
        message.delete();
        let embedMessage = new Discord.RichEmbed()
        .setDescription("Wrong parametres!")
        .addField("Please try again, with this example:",`${prefix}.report {USER_TO_REPORT} {REASON_MESSAGE}`);
        if(args.length < 1){
            return (message.reply(embedMessage));
        }
        let userId = args[0].replace(/[\\<>@#&!]/g, "");    
        if(isNaN(userId)){
            return (message.reply(embedMessage));
        }
        const reportReason = messageArray.slice(2).join(" ");
        message.channel.send(`Report for: <@!${userId}> was sent successfully\nReport reason is **${reportReason}**`).
        then(
        msg=> msg.delete(5000)
        );
        bot.channels.find("name","reports").send(`Report for: <@!${userId}>\nReport from: <@!${userReporterId}>\nReport reason: ${reportReason}\nReport message Id: ${messageId}`);
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
