const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const fs = require('fs');

const GRID_ROWS = 4;
const GRID_COLS = 5;
const TILE_PAIRS = [
  '<:White_Lotus_Tile:1361346119984222328>', '<:White_Lotus_Tile:1361346119984222328>',
  '<:White_Water_Tile:1361345268544442438>', '<:White_Water_Tile:1361345268544442438>',
  '<:White_Earth_Tile:1361346100459601980>', '<:White_Earth_Tile:1361346100459601980>',
  '<:White_Fire_Tile:1361345408785322116>', '<:White_Fire_Tile:1361345408785322116>',
  '<:White_Air_Tile:1361346030263734405>', '<:White_Air_Tile:1361346030263734405>',
  '<:Red_Lotus_Tile:1361783967958958121>', '<:Red_Lotus_Tile:1361783967958958121>',
  '<:Red_Water_Tile:1361783970538193056>', '<:Red_Water_Tile:1361783970538193056>',
  '<:Red_Earth_Tile:1361783962934050888>', '<:Red_Earth_Tile:1361783962934050888>',
  '<:Red_Fire_Tile:1361783965576335460>', '<:Red_Fire_Tile:1361783965576335460>',
  '<:Red_Air_Tile:1361783960765468945>', '<:Red_Air_Tile:1361783960765468945>'
];

const USERS_FILE = './players.json';
const activeGames = new Map();

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getButton(label, index, disabled = false, reveal = false, wrong = false) {
  const button = new MessageButton()
    .setCustomId(`flip-${index}`)
    .setDisabled(disabled)
    .setStyle(wrong ? 'DANGER' : (reveal ? 'SUCCESS' : 'SECONDARY'));

  if (reveal) {
    const emojiMatch = label.match(/<:(.*?):(\d+)>/);
    if (emojiMatch) {
      button.setEmoji({ name: emojiMatch[1], id: emojiMatch[2] });
    } else {
      button.setLabel(label);
    }
  } else {
    button.setLabel('❓');
  }

  return button;
}

function buildButtonGrid(board, revealed, disabled = false, wrongIndexes = []) {
  const rows = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    const row = new MessageActionRow();
    for (let c = 0; c < GRID_COLS; c++) {
      const i = r * GRID_COLS + c;
      row.addComponents(getButton(board[i], i, disabled, revealed[i], wrongIndexes.includes(i)));
    }
    rows.push(row);
  }
  return rows;
}

function startGame(userId) {
  const board = shuffle(TILE_PAIRS);
  const revealed = Array(board.length).fill(false);
  const game = {
    board,
    revealed,
    matched: 0,
    flips: [],
    moves: 0,
    inProgress: true,
    startTime: Date.now()
  };
  activeGames.set(userId, game);
  return game;
}

module.exports = {
  name: 'pai_sho_pairs',
  async execute(interaction, users, saveUsers) {
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const allowedChannelId = '1361437858228867198';
    
    if (interaction.channelId !== allowedChannelId) {
      const wrongChannelEmbed = {
        color: 0xFFA500,
        title: '𑁍 ⎮ Wrong Channel',
        description: `**Please use this command only in the** <#1361437858228867198> **channel.**`,
        thumbnail: {
          url: 'https://64.media.tumblr.com/869eebbc814448e82213b74a3b1b1df7/6a989127da29e9ce-65/s500x750/96a6fdb918e6a31e3856a297b85aab147c923b25.gif'
        },
        footer: {
          text: 'Everything has its place.'
        }
      };

      return interaction.reply({ embeds: [wrongChannelEmbed], ephemeral: true });
    }

    if (!users[userId]) {
      users[userId] = { name: username, points: 0, startTimestamps: [] };
    }
    users[userId].points += 5;
    saveUsers();

    const game = startGame(userId);

    const embed = new MessageEmbed()
      .setColor(0xFFA500)
      .setTitle('𑁍 ⎮ Pai Sho Pairs')
      .setDescription(`🔸 Flip two tiles to find all pairs.\n*🔸 Focus. Memory. Balance.*\n🔸 You’ve earned **5 points** for trying.\n🔸 That’s the spirit! <:uncle_iroh_smiling:1361699713312886976>`)
      .setThumbnail('https://i.postimg.cc/y8yjSYnH/3dgifmaker15308-ezgif-com-crop.gif')
      .setFooter({ text: 'Five minutes. No pressure. Just don’t lose the points, hmm?' });

    const message = await interaction.reply({
      embeds: [embed],
      components: buildButtonGrid(game.board, game.revealed),
      fetchReply: true
    });

    const collector = message.createMessageComponentCollector({
      time: 300 * 1000,
      filter: i => i.user.id === userId
    });

    collector.on('collect', async i => {
      const index = parseInt(i.customId.split('-')[1]);
      const g = activeGames.get(userId);

      if (g.revealed[index] || g.flips.length >= 2) return i.deferUpdate();

      g.flips.push(index);
      g.moves += 1;

      const tempRevealed = [...g.revealed];
      g.flips.forEach(f => tempRevealed[f] = true);

      await i.update({ components: buildButtonGrid(g.board, tempRevealed) });

      if (g.flips.length === 2) {
        const [a, b] = g.flips;
        const isMatch = g.board[a] === g.board[b];

        if (isMatch) {
          g.revealed[a] = true;
          g.revealed[b] = true;
          g.matched += 1;
          g.flips = [];

          await i.editReply({ components: buildButtonGrid(g.board, g.revealed) });

          if (g.matched === TILE_PAIRS.length / 2) {
            g.inProgress = false;
            collector.stop();
            const timeTakenInSeconds = Math.floor((Date.now() - g.startTime) / 1000);
            const minutes = Math.floor(timeTakenInSeconds / 60);
            const seconds = timeTakenInSeconds % 60;

            const playerData = users[userId];

            let recordText = '';
            if (!('bestTime' in playerData)) {
              playerData.bestTime = timeTakenInSeconds;
            } else if (timeTakenInSeconds < playerData.bestTime) {
              playerData.bestTime = timeTakenInSeconds;
              recordText = '\n\n**New Personal Record!** Fastest time yet! <:uncle_iroh_thumbs_up:985298482325782558>';
            }

            saveUsers();

            const winEmbed = new MessageEmbed()
              .setColor(0xFFA500)
              .setTitle('𑁍 ⎮ Harmony Restored')
              .setDescription(`🔸 You found all the pairs in **${minutes} minutes and ${seconds} seconds**!`)
              .setThumbnail('https://64.media.tumblr.com/6895797268eeb7e22587db076e6458f2/e26c13dace1173de-2a/s540x810/3960a81e8636ca59fc7a9f3435ab25d2563ffe49.gif')
              .setFooter({ text: 'Patience, focus, memory… and a little luck.' });

            await i.editReply({
              embeds: [winEmbed],
              components: buildButtonGrid(g.board, g.revealed, true)
            });
          }
        } else {
          const wrongIndexes = [a, b];
          await i.editReply({ components: buildButtonGrid(g.board, tempRevealed, false, wrongIndexes) });

          setTimeout(async () => {
            g.flips = [];
            await i.editReply({ components: buildButtonGrid(g.board, g.revealed) });
          }, 1000);
        }
      }
    });

    collector.on('end', async () => {
      if (game.inProgress) {
        users[userId].points -= 5;
        saveUsers();

        const failEmbed = new MessageEmbed()
          .setColor(0xFF0000)
          .setTitle('𑁍 ⎮ Ahh... Time Slipped Away')
          .setDescription('🔸 The board remains unfinished. The points? Gone.<:uncle_iroh_facepalm:1361703999060967525>\n**🔸 But don’t fret. Try again — and this time, breathe slower.**')
          .setThumbnail('https://media.tenor.com/dcIykVhPLN8AAAAM/iroh-disappoint.gif')
          .setFooter({ text: 'You lost the points, not your honor.' });

        await interaction.editReply({
          embeds: [failEmbed],
          components: buildButtonGrid(game.board, game.revealed, true)
        });
      }
    });
  }
};