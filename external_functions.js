const Discord = require("discord.js");
const botconfig = require("./botconfig.json");
const got = require("got");
var fs = require("fs");
const store = require("nedb");
const lotdb = new store({filename: "./lotDatabase.db", autoload: true});

let db;
let bot;

const prefix = botconfig.prefix;

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
        //let botAvatar = bot.user.displayAvatarURL;
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
        //let botAvatar = bot.user.displayAvatarURL;
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

function getMassRich(data) {
    let embedResponse = new Discord.RichEmbed()
        .setThumbnail(bot.user.displayAvatarURL)
        .setDescription(`Skins from Sellerid ${data.sellerid}`)
        .setColor("#d45f93");
    for (var index in data.skins) {
        var skin = data.skins[index];
        embedResponse.addField(
            `${skin[0]}\nFloat: ${skin[1]}\nPrice: $${skin[2]}\nOverpay: ${
                skin[3]
            }% `,
            `${
                skin[4] == ""
                    ? ""
                    : `[Screenshot](https://s.cs.money/${skin[4]}_image.jpg)`
            } [Link to Item](https://cs.money/#assetid=${skin[5]})`
        );
    }
    return embedResponse;
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
                    var userPromises = [];
                    for (var idIndex in currentDoc.ids) {
                        userPromises.push(
                            bot
                                .fetchUser(currentDoc.ids[idIndex])
                                .then(user => {
                                    user.send(
                                        getRichEmbed(data, currentDoc.skin)
                                    );
                                })
                        );
                    }
                    Promise.all(userPromises).then(function() {
                        db.remove({_id: currentDoc._id}, {}, function(
                            err,
                            numRemoved
                        ) {});
                        checkItemStatus2(docs.slice(1));
                    });
                } else {
                    checkItemStatus2(docs.slice(1));
                }
            })
            .catch(error => {});
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

var first = true;
function lotCheck() {
    lotdb.find({}, function(err, docs) {
        console.log("started lot check");
        var idToNameList = JSON.parse(
            fs.readFileSync("idToNameList.json", "utf8")
        );
        got(`https://cs.money/server_time`, {json: true})
            .then(response => {
                console.log("got server time");
                let data = response.body;
                let servertime = data.serverTime;
                let systemtime = Date.now();
                got(`https://cs.money/auction/all_active_lots?appid=730`, {
                    json: true
                })
                    .then(response => {
                        console.log("got lot data");
                        let data = response.body;
                        let toInsert = [];
                        for (var i = 0; i < data.length; i++) {
                            let assetid = data[i].ap[`assetid`];

                            if (docs.filter(x => x.id === assetid).length > 0) {
                                continue;
                            }
                            let skinName = idToNameList[data[i].o];
                            let screenshot = `https://s.cs.money/${
                                data[i].d
                            }_preview.png?v=22`;
                            let finishTime = data[i].ap[`finishTimestamp`];
                            let highestPrice =
                                data[i].ap[`betsList`][
                                    data[i].ap[`betsList`].length - 1
                                ];
                            if (highestPrice == undefined) {
                                highestPrice = data[i].ap[`startPrice`];
                            }
                            let insertData = {
                                id: assetid
                            };
                            let currentServerTime = new Date(
                                servertime + Date.now() - systemtime
                            );
                            timeDifference = new Date(
                                new Date(finishTime).getTime() -
                                    currentServerTime.getTime()
                            );
                            if (timeDifference < 0) {
                                continue;
                            }
                            if (first) {
                                continue;
                            }
                            console.log(`New lot for ${skinName}`);
                            let embedResponse = new Discord.RichEmbed()
                                .setThumbnail(screenshot)
                                .setDescription(`New lot for ${skinName}`)
                                .setColor("#d45f93")
                                .addField(
                                    `Highest price: ${highestPrice}\nLot ends in: ${timeDifference.getHours() -
                                        1}H ${timeDifference.getMinutes()}M:${timeDifference.getSeconds()}S`,
                                    `lot on cs.money`
                                );
                            bot.channels
                                .find("name", "new-lots")
                                .sendEmbed(embedResponse);
                            toInsert.push(insertData);
                        }
                        first = false;
                        lotdb.insert(toInsert);
                    })
                    .catch(error => {
                        console.log(error);
                    });
            })
            .catch(error => {
                console.log(error);
            });
    });
    setTimeout(function() {
        lotCheck();
    }, 1000 * 30);
}

module.exports = function(_bot, _db) {
    db = _db;
    bot = _bot;
    return {
        similarity,
        editDistance,
        getImageUrlFromName,
        getRichEmbed,
        checkItemStatus2,
        startItemCheck,
        lotCheck,
        getMassRich
    };
};
