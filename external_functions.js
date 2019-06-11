const Discord = require("discord.js");
const got = require("got");
var fs = require("fs");
const store = require("nedb");
const db = new store({ filename: "database.db", autoload: true });

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

function getImageUrlFromName(skinName) {
    //Probably better to store in memory
    var skinList = JSON.parse(fs.readFileSync("skinList.json", "utf8"));
    return `https://pic.csgo.trade/730/${skinList[skinName]}.jpg?v=22 `;
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

function checkItemStatus2(docs) {
    if (docs.length > 0) {
        currentDoc = docs[0];
        got(
            `https://cs.money/check_skin_status?market_hash_name=${
                currentDoc.skin
            }&appid=730`,
            { json: true }
        )
            .then(response => {
                let data = response.body;
                if (data.type == "Tradable") {
                    for (var idIndex in currentDoc.ids) {
                        bot.fetchUser(currentDoc.ids[idIndex]).then(user =>
                            user.send(getRichEmbed(data, currentDoc.skin))
                        );
                    }
                    db.remove({ _id: currentDoc._id }, {}, function(
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
                { json: true }
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
                        db.remove({ _id: docs[docIndex]._id }, {}, function(
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

module.exports = {
    similarity,
    editDistance,
    getImageUrlFromName,
    getRichEmbed,
    checkItemStatus2,
    startItemCheck,
    checkItemStatus
};
