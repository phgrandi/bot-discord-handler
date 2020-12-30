const {
    Client,
    Collection,
    APIMessage,
    Message
} = require("discord.js");
const {
    readdir,
    lstatSync
} = require("fs");
const {
    token,
    prefix
} = require("./config.json");
const client = new Client();

/**
 * @param {StringResolvable|APIMessage} [content='']
 * @param {MessageOptions|MessageAdditions} [options={}]
 * @param {string} [options?.messageID] - o ID da mensagem que será citada
 * @param {boolean} [options?.mention] - caso deva mencionar o autor da mensagem
 */

Message.prototype.quote = async function (content, options) {
    const message_reference = {
        message_id: (
            !!content && !options
                ? typeof content === 'object' && content.messageID
                : options && options.messageID
        ) || this.id,
        message_channel: this.channel.id
    }

    const allowed_mentions = {
        parse: ['users', 'roles', 'everyone'],
        replied_user: typeof content === 'object' ? content && +content.mention : options && +options.mention
    }

    const { data: parsed, files } = await APIMessage
        .create(this, content, options)
        .resolveData()
        .resolveFiles()

    this.client.api.channels[this.channel.id].messages.post({
        data: { ...parsed, message_reference, allowed_mentions },
        files
    })
};

client.on("ready", () => {
    console.log(`Logged in: ${client.user.tag}`)
})


client.cmds = new Collection();
client.aliases = new Collection();


const carregarComandos = module.exports.carregarComandos = (dir = "./commands/") => {
    readdir(dir, (erro, arquivos) => {
        if (erro) return console.log(erro);
        arquivos.forEach((arquivo) => {
            try {
                if (lstatSync(`./${dir}/${arquivo}`).isDirectory()) {
                    carregarComandos(`./${dir}/${arquivo}`)
                } else if (arquivo.endsWith(".js")) {
                    console.log(`Iniciando leitura do arquivo: ${arquivo.split(".")[0]}`)
                    const salvar = (nome, aliases = [], props) => {
                        client.cmds.set(nome, props)
                        if(aliases.length > 0) aliases.forEach((alias) => client.aliases.set(alias, props))
                    }
                    const props = require(`./${dir}/${arquivo}`)
                    if(!props.run)  {
                        console.log(`Não existe uma função que ative o comando no arquivo: ${arquivo.split(".")[0]}. Então ele foi ignorado`);
                        return;
                    }

                    if (props.info && props.info.name) {
                        const nome = props.info.name
                        const aliases = props.info.aliases || []
                        salvar(nome, aliases, props)
                    } else {
                        const propsKeys = Object.keys(props)
                        if (!propsKeys) {
                            console.log(`Não existem propiedades no arquivo: ${arquivo.split(".")[0]}. Então ele foi ignorado.`)
                            return;
                        }
                        const nomeKey = propsKeys.find((key) => props[key] && (props[key].name || props[key].nome))
                        if(!nomeKey) {
                            console.log(`Não existe a propiedade que remeta ao nome do comando no arquivo: ${arquivo.split(".")[0]}. Então ele foi ignorado.`)
                            return; 
                        }

                        const nome = props[nomeKey].name || props[nomeKey].nome
                        const aliases = props[nomeKey].aliases || []
                        salvar(nome, aliases, props)
                    }
                }
            } catch (ex) {
                console.log(`Erro ao ler o arquivo ${arquivo}`)
                console.log(ex)
            }
        })
    })
}
carregarComandos();

client.on("message", async message => {
    if (message.author.bot) return;
    if (message.content.indexOf(prefix) !== 0) return;
    if (message.channel.type != 'text') return;
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();

    const cmdParaExecutar = client.cmds.get(cmd) || client.aliases.get(cmd)
    if (cmdParaExecutar) cmdParaExecutar.run(client, message, args)
})

client.login(token)
