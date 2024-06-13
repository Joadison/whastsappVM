const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia  } = require('whatsapp-web.js');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios')

const app = express()
app.use(cors())
app.use(express.json())

const client = new Client({
    authStrategy: new LocalAuth(),
    webVersionCache: {
        type: "remote",
        remotePath:
          "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
      },
});

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('WhatsApp Bot Autenticado Com Sucesso!')
})

client.on('disconnected', () => {
    console.log('WhatsApp desconectado!')
})

client.on('ready', () => {
    console.log('WhatsApp Bot Carregado Com sucesso!')
});

client.on('error', (err) => {
    console.error('Client error:', err);
});

app.post('/chat/send-message', async (req, res) => {
    const { to, message } = req.body
  
    try {
      await client.sendMessage(to, message)
      res.status(200).json({ success: true })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Failed to send message' })
    }
})

app.get('/chat/get-all-messages/:id', async (req, res) => {
    const {id} = req.params;

    try {
        const chat = await client.getChatById(id);
        const messages = await chat.fetchMessages({ limit: 10 });
        const formattedMessages = [];

        for (const message of messages) {
          if (message.hasMedia === true) {
              const media = await message.downloadMedia();
              console.log('Downloaded media:', media.data);
              const mediaData = media.data;
              const decodedMedia = Buffer.from(mediaData, 'base64');
              const mediaUrl = message._data.deprecatedMms3Url;
              const mediaType = message._data.mimetype.split('/')[0];

              const saveDir = path.join(__dirname, 'files', mediaType);
              if (!fs.existsSync(saveDir)) {
                fs.mkdirSync(saveDir, { recursive: true });
              }

              const fileName = `${message.id.id}.${message._data.mimetype.split('/')[1]}`;
              const savePath = path.join(saveDir, fileName);

              fs.writeFileSync(savePath, decodedMedia);
              console.log('File saved:', savePath);

              formattedMessages.push({
                  user: message.from,
                  mediaUrl: mediaUrl,
                  savedFilePath: savePath
              });
          } else {
              formattedMessages.push({
                  user: message.from,
                  message: message.body
              });
          }
      }
        res.status(200).json(formattedMessages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
})

app.post('/chat/send-file/:file', async (req, res) => {
  const { to, message } = req.body
  const { file } = req.params  

  try {
    const media = MessageMedia.fromFilePath(file);
    await client.sendMessage(to, media, {caption: message})
    res.status(200).json({ success: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

app.post('/chat/send-bulk-messages', async (req, res) => {
  const { users, message, imageUrl } = req.body;

  try {
    const media = await MessageMedia.fromFilePath(imageUrl);

    for (const user of users) {
      await client.sendMessage(`5585${user}@c.us`, media, { caption: message });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send messages' });
  }
});

app.listen(3001, async ()=> {
    console.log(`Servidor rodando na porta ${3001}`)
    await client.initialize()

    client.on('message_create', async (message) => {
      const user = message._data.id.remote.split('@');
      if(user[1] === 'c.us'){ 
       console.log(user)
      }
      if (message.body === 'Quero massagem!') {
        client.sendMessage(message.from, 'Olá, acesse o nosso Site a Agende a sua Massagem: https://vm-estetica-corporal.vercel.app/');
      }
    });

    process.on('beforeExit', () => {
      console.log('Servidor encerrado!')
      console.log('WhatsApp encerrado!')
    })
  })
