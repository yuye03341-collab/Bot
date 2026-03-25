const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

let data = {};

// 读取数据
if (fs.existsSync('data.json')) {
  data = JSON.parse(fs.readFileSync('data.json'));
}

// 保存
function save() {
  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}

// 获取群数据
function getChat(chatId) {
  if (!data[chatId]) data[chatId] = [];
  return data[chatId];
}

// 判断管理员
async function isAdmin(chatId, userId) {
  try {
    const admins = await bot.getChatAdministrators(chatId);
    return admins.some(a => a.user.id === userId);
  } catch {
    return true;
  }
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text.trim();

  const chatData = getChat(chatId);
  const admin = await isAdmin(chatId, userId);

  const match = text.match(/^(.+)([+-]\d+)$/);
  if (match) {
    if (!admin) return bot.sendMessage(chatId, '❌ 仅管理员');

    const name = match[1];
    const amount = parseInt(match[2]);

    chatData.push({ name, amount, time: new Date().toLocaleString() });
    save();

    return bot.sendMessage(chatId, `✅ ${name} ${amount}`);
  }

  if (text === '统计') {
    let inTotal = 0, outTotal = 0;

    chatData.forEach(d => {
      d.amount > 0 ? inTotal += d.amount : outTotal += d.amount;
    });

    return bot.sendMessage(chatId,
      `📊 收入：${inTotal}\n支出：${Math.abs(outTotal)}`
    );
  }

  if (text === '列表') {
    let msgText = '📋 记录：\n';
    chatData.forEach((d, i) => {
      msgText += `${i+1}. ${d.name} ${d.amount}\n`;
    });

    return bot.sendMessage(chatId, msgText || '暂无');
  }

  const del = text.match(/^删除 (\d+)$/);
  if (del) {
    if (!admin) return bot.sendMessage(chatId, '❌ 仅管理员');

    const i = parseInt(del[1]) - 1;
    if (chatData[i]) {
      const r = chatData.splice(i, 1);
      save();
      return bot.sendMessage(chatId, `❌ 已删 ${r[0].name}`);
    }
  }

});
