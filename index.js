require('dotenv').config()

const decompress = require("decompress");
const pm2 = require("pm2")

const cp = require("child_process")
const fs = require("fs")
const https = require("https")
const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

client.on("messageCreate", (message) => {
    if (!message.content.startsWith(process.env.PREFIX)) return;
    let cmd = message.content.slice(process.env.PREFIX.length).split(" ")

    switch (cmd[0]) {

        case "update":
        case "upload":
            if (!message.attachments.first()) return message.reply("Please attach a zip file containing your game!")
            let url = message.attachments.first().url
            if (!url.endsWith(".zip")) return message.reply("upload a zip file plz")

            const filename = "game.zip"
            let stream = fs.createWriteStream(filename)

            https.get(url, (res) => {
                res.pipe(stream)

                stream.on("finish", () => {
                    stream.close()
                    message.reply("Successfully saved " + filename)

                    if (fs.existsSync("data"))
                        fs.rmSync("data", { recursive: true })

                    decompress(filename, "data").then((files) => {
                        message.reply("Successfully extracted the game")
                    }).catch((err) => {
                        message.reply("Extract error" + err.message)
                    })

                })
            }).on("error", (err) => {
                return message.reply("Error:" + err.message)
            })
            break;

        case "start":
            if (fs.existsSync(process.cwd() + '/logs.txt'))
                fs.rmSync(process.cwd() + '/logs.txt', { recursive: true })
            pm2.start({
                name: 'BrickHillGame',
                script: process.cwd() + '/data/start.js',
                watch: false,
                max_memory_restart: '1G',
                cwd: process.cwd() + "/data/",
                output: process.cwd() + '/logs.txt',
                error: process.cwd() + '/logs.txt',

            }, (err) => {
                if (err) {
                    message.reply('Error:', err.message);
                    console.log(err)
                } else {
                    message.reply('Process started successfully');
                }
            });
            break;

        case "stop":
        case "shutdown":
        case "kill":
            pm2.delete("BrickHillGame", (err, proc) => {
                if (err) {
                    message.reply('Error:', err.message);
                } else {
                    message.reply('Process stopped successfully');
                }
            })
            break;

        case "logs":
            message.reply({ files: [new AttachmentBuilder("./logs.txt")] })
            break;

        case "npmi":
            cp.exec("npm i", { cwd: process.cwd() + "/data/" }, (err) => {
                if (err) {
                    message.reply('Error:', err.message);
                } else {
                    message.reply('Installed npm packages successfully');
                }
            })
            break;

        case "addfile": {
            if (!message.attachments.first()) return message.reply("Please attach a file!")
            message.attachments.forEach((file) => {

                if (!fs.existsSync("data/" + cmd[1].replaceAll("..", ""))) {
                    fs.mkdir("data/" + cmd[1].replaceAll("..", ""), { recursive: true }, (err) => {
                        if (err) return message.reply("error while creating missing directories: " + err.message)
                    });
                }

                const filename = ("data/" + cmd[1] + file.name).replaceAll("..", "")
                let stream = fs.createWriteStream(filename)

                https.get(file.url, (res) => {
                    res.pipe(stream)

                    stream.on("finish", () => {
                        stream.close()
                        message.reply("Successfully saved " + filename)
                    })
                }).on("error", (err) => {
                    return message.reply("Error:" + err.message)
                })

            })
            break;
        }
        case "remove":
        case "delete":
            if (!cmd[1]) return message.reply("whatcya wanna delete dumass")
            fs.rm("data/" + cmd[1].replaceAll("..", ""), { recursive: true }, (err) => {
                if (err) {
                    message.reply("error grrr:" + err.message)
                } else {
                    message.reply("Deleted " + cmd[1])
                }
            })
            break;

        case "files":
            if (!cmd[1]) cmd[1] = ""
            fs.readdir("data/" + cmd[1].replaceAll("..", ""), (err, files) => {
                if (err) {
                    message.reply("error grrr:" + err.message)
                } else {
                    message.reply("```" + files.join("\n") + "```")
                }
            })
            break
        default:
            break;
    }
})

client.login(process.env.TOKEN).then(() => { console.log("ayo this shit runnin at " + client.user.username + "#" + client.user.discriminator) })
