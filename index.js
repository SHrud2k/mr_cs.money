const botconfig = require("./botconfig.json");
const Discord = require("discord.js");
const got = require('got');

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

    if(cmd === `${prefix}status`){
        let skinName = args.join(" ");
        message.delete();
        if(!(skinName.includes("|") && skinName.includes("(") && skinName.includes(")"))){
            got(`https://cs.money/get_auto_complete?part_name=${encodeURIComponent(skinName)}&appid=730`, { json: true }).then(response => {
                let data = response.body;
                if(data.length == 0){
                    return message.reply("skin not found"); 
                }
                let highestIndex = 0;
                let highestRate = 0;
                for(var i = 0; i < data.length; i++){
                    let similarityscore = similarity(skinName,data[i]);
                    if(similarityscore > highestRate){
                        highestRate = similarityscore;
                        highestIndex = i;
                    }
                }
                skinName = encodeURIComponent(data[highestIndex]);
                got(`https://cs.money/check_skin_status?market_hash_name=${skinName}&appid=730`, { json: true }).then(response => {
                    let data = response.body;
                    
                    let botAvatar = bot.user.displayAvatarURL;
                    let embedResponse = new Discord.RichEmbed()
                    .setThumbnail(botAvatar)
                    .setDescription(`Skin Status of ${decodeURIComponent(skinName)}`)
                    .setColor("#d45f93")
                    .addField(`Trade status: ${data.type} \nAmount till overstock: ${data.overstock_difference}`,`[Get ${decodeURIComponent(skinName)} on CS.Money](https://cs.money/?s=float#skin_name_buy=${encodeURIComponent(skinName)}`)
            
                    message.reply({
                        embed: embedResponse,
                    })
                })
            })
        }else{
            skinName = encodeURIComponent(skinName);
            got(`https://cs.money/check_skin_status?market_hash_name=${skinName}&appid=730`, { json: true }).then(response => {
                let data = response.body;

                let botAvatar = bot.user.displayAvatarURL;
                let embedResponse = new Discord.RichEmbed()
                .setThumbnail(botAvatar)
                .setDescription(`Skin Status of ${decodeURIComponent(skinName)}`)
                .setColor("#d45f93")
                .addField(`Trade status: ${data.type} \nAmount till overstock: ${data.overstock_difference}`,`[Get ${decodeURIComponent(skinName)} on CS.Money](https://cs.money/?s=float#skin_name_buy=${encodeURIComponent(skinName)}`)
        
                message.reply({
                    embed: embedResponse,
                })
            }).catch(error => {
                return message.reply("skin not found");
              });
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
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
  
    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
      var lastValue = i;
      for (var j = 0; j <= s2.length; j++) {
        if (i == 0)
          costs[j] = j;
        else {
          if (j > 0) {
            var newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue),
                costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

bot.login(botconfig.token);
