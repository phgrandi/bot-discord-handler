const Discord = require("discord.js");
module.exports.run = async (client, message, args) => {
    message.quote(`Pong! (${client.ws.ping})`, {MessageID: message.id});
};
module.exports.info = {
    name: "ping",
    aliases: ["latency"]
}