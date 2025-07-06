require('dotenv').config();
const fs = require('fs');

const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

// keepAlive
const express = require('express');
const app = express();

// A simple route that returns a message
app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

// Start server on port 3000 or the port Glitch sets
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

module.exports = app;

const getClue = require('./clues');
const paiShoPairs = require('./paiShoPairs');
const helpCommand = require('./help');

const GRID_SIZE = 5;
const USERS_FILE = './players.json';

let shuffledGrid = [];
let lotusIndex = null;
let irohIndex = null;
let lotusTile = null;
let irohTile = null;
let clue = '';
let gameActive = false;
let gameTimeout = null;
let gameStartTime = null;

let users = {}; 
if (fs.existsSync(USERS_FILE)) { 
  users = JSON.parse(fs.readFileSync(USERS_FILE)); 
}



// Ready Event
client.on('ready', () => {
  console.log('IROH CHALLENGE BOT IS ALIVE');

  const activities = [
    { name: 'with the Lotus tile', type: 0 }, // Playing
    { name: '/help', type: 3 },     // Watching
  ];

  let currentIndex = 0;

  // Function to update activity
  function updateActivity() {
    const activity = activities[currentIndex];
    client.user.setActivity(activity.name, { type: activity.type });

    // Move to the next activity
    currentIndex = (currentIndex + 1) % activities.length;
  }

  // Set initial activity and then alternate every 10 seconds
  updateActivity();
  setInterval(updateActivity, 10000);
});

async function updatePlayersOnGitHub() {
  const filePath = './players.json';
  const githubRepo = 'iroh8619/iroh-bot';
  const githubFilePath = 'players.json';
  const githubToken = process.env.GITHUB_TOKEN;

  const content = fs.readFileSync(filePath, 'utf8');
  const encodedContent = Buffer.from(content).toString('base64');

  try {
    // Récupérer le SHA du fichier actuel sur GitHub
    const getRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${githubFilePath}`, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    const fileData = await getRes.json();
    const sha = fileData.sha;

    // Mettre à jour le fichier
    await fetch(`https://api.github.com/repos/${githubRepo}/contents/${githubFilePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: '📝 Update players.json',
        content: encodedContent,
        sha
      })
    });

    console.log('✅ players.json successfully pushed to GitHub.');
  } catch (err) {
    console.error('❌ Failed to update players.json on GitHub:', err.message);
  }
}

function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  updatePlayersOnGitHub();
}

function getCoords(index) {
  return {
    row: Math.floor(index / GRID_SIZE) + 1,
    col: (index % GRID_SIZE) + 1
  };
}

function getIndex(row, col) {
  return (row - 1) * GRID_SIZE + (col - 1);
}

function generateGrid() {
  const totalTiles = GRID_SIZE * GRID_SIZE;
  shuffledGrid = Array.from({ length: totalTiles }, (_, i) => i + 1);
  for (let i = shuffledGrid.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledGrid[i], shuffledGrid[j]] = [shuffledGrid[j], shuffledGrid[i]];
  }

  lotusIndex = Math.floor(Math.random() * totalTiles);
  lotusTile = shuffledGrid[lotusIndex];
  const lotus = getCoords(lotusIndex);

  const possibleOffsets = [];
  const deltas = [1, 2, 3, 4, 5];

  for (let dr of deltas) {
    for (let dc of deltas) {
      possibleOffsets.push({ dr, dc });
      possibleOffsets.push({ dr: -dr, dc });
      possibleOffsets.push({ dr, dc: -dc });
      possibleOffsets.push({ dr: -dr, dc: -dc });
    }
  }

  for (let attempt = 0; attempt < 100; attempt++) {
    const offset = possibleOffsets[Math.floor(Math.random() * possibleOffsets.length)];
    const newRow = lotus.row + offset.dr;
    const newCol = lotus.col + offset.dc;

    if (newRow >= 1 && newRow <= GRID_SIZE && newCol >= 1 && newCol <= GRID_SIZE) {
      irohIndex = getIndex(newRow, newCol);
      irohTile = shuffledGrid[irohIndex];
      clue = getClue(offset.dr, offset.dc);
      break;
    }
  }

  // Create button grid
  const components = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    const actionRow = new MessageActionRow();
    for (let col = 0; col < GRID_SIZE; col++) {
      const index = row * GRID_SIZE + col;
      const tileNumber = shuffledGrid[index];
      const button = new MessageButton()
        .setCustomId(`guess_${tileNumber}`)
        .setStyle(index === lotusIndex ? 'PRIMARY' : 'SECONDARY');

      if (index === lotusIndex) {
        button.setEmoji('1361346119984222328'); // Custom emoji ID for LOTUS
      } else {
        button.setLabel('❓');
      }

      actionRow.addComponents(button);
    }
    components.push(actionRow);
  }

  return components;
}


function buildGrid() {
  let grid = '';
  for (let i = 0; i < shuffledGrid.length; i++) {
    if (i === lotusIndex) {
      grid += '<:White_Lotus_Tile:1361346119984222328>';
    } else {
      grid += `\`${shuffledGrid[i].toString().padStart(2, '0')}\` `;
    }
    if ((i + 1) % GRID_SIZE === 0) grid += '\n';
  }
  return grid;
}

client.on('interactionCreate', async interaction => {
    // 🔘 Handle Button Interactions
  if (interaction.isButton()) {
    const customId = interaction.customId;

    // ⛔ Skip handling if it's a /pai sho pairs or help navigation button
    if (customId.startsWith('flip-') || customId === 'next' || customId === 'prev') return;


    // ✅ This is a /start button interaction
    const userId = interaction.user.id;
    const username = interaction.user.username;


    const guessedTile = parseInt(interaction.customId.replace('guess_', ''), 10);

    if (guessedTile === irohTile) {
      gameActive = false;
      clearTimeout(gameTimeout);

      const timeTaken = Math.floor((Date.now() - gameStartTime) / 1000);
      const pointsEarned = Math.max(5, 60 - timeTaken + Math.floor(Math.random() * 5));

      users[userId].points += pointsEarned;
      saveUsers();

const successPhrases = [
  `There you are!\n🔸 I was beginning to think you'd stopped for snacks.`,
  `Ahh, clever move.\n🔸 I knew you'd find me!`,
  `Took you long enough — I almost finished my tea!`,
  `You’ve got sharp eyes, young one.\n🔸 Nicely done!`,
  `I knew it was only a matter of time before you arrived.`,
  `You found me — and just before I dozed off!`,
  `The wind told me someone would come.\n🔸 I'm glad it was you!`,
  `There you are.\n🔸 I was waiting with quiet faith.`,
  `Haha! I was starting to get comfortable here.`
];


const chosenPhrase = successPhrases[Math.floor(Math.random() * successPhrases.length)];

const successEmbed = {
  color: 0xFFA500,
  title: '𑁍 ⎮ You Found Uncle Iroh!',
  description: `🔸 ${chosenPhrase} <:uncle_iroh_proud:1361747148630397078>\n🔸 You earned **${pointsEarned} points**.`,
  thumbnail: {
    url: "https://i.imgur.com/gcrOMRu.gif"
  },
  footer: {
    text: 'Good things come to those who seek with care.'
  }
};


      // Clone current button components
const updatedComponents = interaction.message.components.map((row, rowIndex) => {
  const newRow = new MessageActionRow();
  row.components.forEach((button) => {
    const tileNum = parseInt(button.customId.replace('guess_', ''));
    const newButton = new MessageButton()
      .setCustomId(button.customId)
      .setStyle(button.style)
      .setDisabled(button.disabled)
      .setLabel(button.label ?? '')
      .setEmoji(button.emoji?.id || button.emoji?.name || undefined);


    if (tileNum === irohTile) {
      newButton.setEmoji('1361699713312886976'); // IROH emoji ID
      newButton.setStyle('SUCCESS');
      newButton.setLabel(''); // ❌ Remove the number label
    } else {
      newButton.setDisabled(true); // Optional: disable all others
    }

    newRow.addComponents(newButton);
  });
  return newRow;
});

// Edit the original message with new embed and updated buttons
await interaction.update({
  embeds: [successEmbed], // Use the same embed structure
  components: updatedComponents
});

    } else {
      await interaction.deferUpdate(); // silently acknowledge the button press

const missMessages = [
  `Not quite, my friend. Try somewhere else!`,
  `Hmm... I’m not hiding *there*!`,
  `You’re close — I can feel it!`,
  `No tea at this spot. Maybe the next one?`,
  `That’s not where I’m sipping tea. Look again!`,
  `Good instinct... but not the right place.`,
  `You’re circling me. Keep going!`,
  `Ah, not this one. But you're on the right path my friend!`,
  `I’m somewhere else — but don’t give up!`,
];


const chosenMiss = missMessages[Math.floor(Math.random() * missMessages.length)];

const reply = await interaction.followUp({
  content: `${chosenMiss} <:uncle_iroh:1361764990369136710>`,
  ephemeral: false
});


// Auto-delete after 4 seconds
setTimeout(() => {
  reply.delete().catch(() => {});
}, 4000);


      }
  }
  if (!interaction.isCommand()) return;
  
    const allowedChannelName1 = 'irohs-office';
    const allowedChannelName2 = 'irohs-office'

  if (interaction.channel.name !== allowedChannelName1 && interaction.channel.name !== allowedChannelName2) {
    const wrongChannelEmbed = {
      color: 0xFFA500,
      title: '𑁍 ⎮ Wrong Channel',
      description: `**Please use this bot in the following channels only:**\n\n` +
             `🔸 <#1361435127049359624>\n` +
             `🔸 <#1361437858228867198>`,
      thumbnail: {
        url: "https://64.media.tumblr.com/869eebbc814448e82213b74a3b1b1df7/6a989127da29e9ce-65/s500x750/96a6fdb918e6a31e3856a297b85aab147c923b25.gif"
      },
      footer: {
        text: 'Everything has its place.'
      }
    };

    return interaction.reply({ embeds: [wrongChannelEmbed], ephemeral: true });
  }

  const userId = interaction.user.id;
  const username = interaction.user.username;
  
  //Join command

if (interaction.commandName === 'join') {
  const avatarURL = interaction.user.displayAvatarURL({ dynamic: true, size: 256 });

  const embed = {
    author: {
      name: interaction.user.username,
      icon_url: avatarURL,
    },
    thumbnail: { url: "https://i.imgur.com/YKQuyqs.gif" },
    color: 0xFFA500, // Orange
  };

  if (users[userId]) {
    embed.title = '𑁍 ⎮ Already Joined';
    embed.description = `🔸 You're already part of the search, <@${userId}>.\n🔸 I’ve kept the tea warm for you. <:cup_of_tea:1361698519471100157>`;
      embed.footer = {text: 'Still walking the path... and still welcome.'}
    return interaction.reply({ embeds: [embed], ephemeral: false });
  }

  // New registration
  users[userId] = { name: username, points: 0 };
  saveUsers();

  embed.title = '𑁍 ⎮ You’re In, My Friend!';
  embed.description = `🔸 Welcome to the <@&1362101024994885859>, <@${userId}>!`+ ' <:uncle_iroh:1361764990369136710>\n🔸 Use \`/help\` to begin your journey.';
  embed.footer = {text: 'The journey is just beginning!'}
  return interaction.reply({ embeds: [embed], ephemeral: false });
}


if (!users[userId]) {
  const notRegisteredEmbed = {
    color: 0xFFA500,
    title: '𑁍 ⎮ A New Journey Awaits',
    description: 
                  '🔸 Use `/join` to begin your journey.\n' +
                  '🔸 Then use the command `/help` to learn how to use the bot.',
    thumbnail: {
      url: "https://media.tenor.com/Wv4GuSuR2JoAAAAM/iroh-blush.gif"
    },
    footer: {
      text: 'Every journey starts with a first step.'
    }
  };
  return interaction.reply({ embeds: [notRegisteredEmbed], ephemeral: false });
}

  
  //Command Find Uncle Iroh

if (interaction.commandName === 'irohs-office') {
  const allowedChannelName = 'irohs-office';

  if (interaction.channel.name !== allowedChannelName) {
    const wrongChannelEmbed = {
      color: 0xFFA500,
      title: '𑁍 ⎮ Wrong Channel',
      description: `**Please use this command only in the** <#1361435127049359624> **channel.**`,
      thumbnail: {
        url: 'https://64.media.tumblr.com/869eebbc814448e82213b74a3b1b1df7/6a989127da29e9ce-65/s500x750/96a6fdb918e6a31e3856a297b85aab147c923b25.gif'
      },
      footer: {
        text: 'Everything has its place.'
      }
    };

    return interaction.reply({ embeds: [wrongChannelEmbed], ephemeral: true });
  }
  const now = Date.now();
  const COOLDOWN_PERIOD = 5 * 60 * 60 * 1000; // 5 hours
  const MAX_USES = 10;

  if (!users[userId].startTimestamps) {
    users[userId].startTimestamps = [];
  }

// Keep only timestamps within the last 30 minutes
users[userId].startTimestamps = users[userId].startTimestamps.filter(ts => now - ts < COOLDOWN_PERIOD);
let timestamps = users[userId].startTimestamps;

if (timestamps.length >= MAX_USES) {
const timeLeft = COOLDOWN_PERIOD - (now - timestamps[0]);
const totalMinutes = Math.ceil(timeLeft / (1000 * 60));
const remainingHours = Math.floor(totalMinutes / 60);
const remainingMinutes = totalMinutes % 60;

let timeString = '';
if (remainingHours > 0) {
  timeString += `**${remainingHours} hour(s)**`;
}
if (remainingMinutes > 0) {
  if (timeString) timeString += ' and ';
  timeString += `**${remainingMinutes} minute(s)**`;
}


  const cooldownEmbed = {
    color: 0xFFA500,
    title: '𑁍 ⎮ Take a Moment, My Friend',
    description: `🔸 \`/find_uncle_iroh\` **${MAX_USES} times?** In a row? <:uncle_iroh_happy:1361762397718577175>\n🔸 You must really want to find me.\n🔸 Let’s pause for ${timeString}. <:uncle_iroh_sleeping:1361744750096683240>\n🔸 The best tea takes time to steep.`+'\n\n**While you wait, why not pass the time with a game of Pai Sho?\nTry `\pai_sho_pairs`.** <:paisho:1361719551305191635>',
    thumbnail: {
      url: "https://i.pinimg.com/originals/e1/ba/7d/e1ba7d1abdb46a1fce2781170c2add71.gif"
    }
  };

  // Schedule clearing timestamps and sending DM
  setTimeout(async () => {
    users[userId].startTimestamps = [];
    saveUsers();

    try {
      const dmUser = await client.users.fetch(userId);
      const cooldownOverEmbed = {
        color: 0xFFA500,
        title: '𑁍 ⎮ You May Continue',
        description: `🔸 Find me in the woods!\n🔸 Use \`/find_uncle_iroh\`! \n🔸 I’ve kept the kettle warm. <:uncle_iroh_tea:1361742103138406410>`,
        thumbnail: {
          url: "https://c.tenor.com/U6UXYsssNrUAAAAd/tenor.gif"
        },
        footer: {
          text: 'A new chance always comes… if you’re patient.'
        }
      };

      await dmUser.send({ embeds: [cooldownOverEmbed] });

    } catch (err) {
      console.error(`Could not send DM to ${userId}:`, err);
    }
  }, timeLeft);

  return interaction.reply({ embeds: [cooldownEmbed], ephemeral: false });
}


  timestamps.push(now);
  users[userId].startTimestamps = timestamps;
  saveUsers();
  
  // Schedule automatic cleanup in 3 minutes after this attempt
  setTimeout(() => {
    const currentTime = Date.now();
    const updatedTimestamps = users[userId].startTimestamps?.filter(ts => currentTime - ts < COOLDOWN_PERIOD) || [];

    if (updatedTimestamps.length === 0 || updatedTimestamps.every(ts => currentTime - ts >= COOLDOWN_PERIOD)) {
      users[userId].startTimestamps = [];
      saveUsers();
    }
  }, COOLDOWN_PERIOD);

  const grid = generateGrid();
  gameActive = true;
  gameStartTime = Date.now();

  if (gameTimeout) clearTimeout(gameTimeout);
  gameTimeout = setTimeout(() => {
    gameActive = false;
    interaction.followUp(`**Time's up!** <:uncle_iroh_facepalm:1361703999060967525>\nEven`+ ' **I** cannot wait forever, my friend. You will need to use \`/find-uncle-iroh\` again to try again.');
  }, 60000);

  const components = generateGrid();

  const startEmbed = {
    color: 0xFFA500,
    title: '𑁍 ⎮ Find Uncle Iroh!',
    description: `**🔸 Ahh... you've found my White Lotus tile!\n 🔸 Let’s see if you can actually find *me*!** <:uncle_iroh_thinking:1361761610556768316>\n\n**Clue:** ${clue}\n\n*Use your mind, not just your eyes.*`,
    thumbnail: {
      url: 'https://i.imgur.com/DUwN3G6.gif'
    },
    footer: {
      text: 'You have 60 seconds. Wisdom is swift when the mind is calm.'
    }
  };

  return interaction.reply({ embeds: [startEmbed], components, ephemeral: false });
}
  
  //Command leaderboard

  
if (interaction.commandName === 'leaderboard') {
  const sorted = Object.entries(users)
    .sort((a, b) => b[1].points - a[1].points)
    .slice(0, 10);

  const medals = ['🥇', '🥈', '🥉'];

const board = sorted.map(([id, data], index) => {
  // Set the medal for 1st, 2nd, and 3rd place
  let medal = medals[index] || `**${index + 1}.**`; // For places 4th and onward, use the 🔸 medal
  
  if (index >= 3) {
    medal = "🔸";  // Assign 🔸 for 4th place and beyond
  }
  
  const bestTimeLine = data.bestTime !== undefined ? `Best Time: ${data.bestTime}s` : '';
  const [topUserId, topUserData] = sorted[0];
  
  return `${medal} <@${id}>\n🔹 ${data.points} points`;
}).join('\n\n');


  const leaderboardEmbed = {
    color: 0xFFA500,
    title: '𑁍 ⎮ Leaderboard',
    description: board || 'No dragons have risen yet.',
    thumbnail: {
      url: "https://i.pinimg.com/originals/f2/34/f7/f234f7dab3ca899f230aebb3efb90c91.gif"
    },
    footer: {
      text: 'Climb with skill. Stay with wisdom.'
    }
  };

  return interaction.reply({ embeds: [leaderboardEmbed], ephemeral: false });
}


// Help command
  
if (interaction.commandName === 'help') {
  return helpCommand.execute(interaction);
}

  
  const fs = require('fs');
const path = require('path');

// Reward command
if (interaction.commandName === 'reward') {

  // Only allow the owner
  if (interaction.user.id !== process.env.OWNER_ID) {
    const notOwnerEmbed = {
      color: 0xFFA500,
      title: '𑁍 ⎮ Restricted Access',
      description: 'Only **<@707124653482836009>** can reward the **Top 1 Dragon** with the <@&1361086150965596271> title. <:uncle_iroh_noodles:1361745624311005538>',
      thumbnail: {
        url: "https://media.tenor.com/p7617-NIP6MAAAAM/uncle-iroh-atla.gif"
      },
      footer: {
        text: 'Your intentions are noble, but this power is not yours to wield.'
      }
    };

    return interaction.reply({ embeds: [notOwnerEmbed], ephemeral: false });
  }

  const today = new Date();
  const isFirstDay = today.getDate() === 19;

  if (!isFirstDay) {
    const notFirstEmbed = {
      color: 0xFFA500,
      title: '𑁍 ⎮ Not Today',
      description: 'This command can **only** be used on the **1st of the month** to reward the top dragon. <:uncle_iroh_pinched_fingers:1361734521208307861>',
      thumbnail: {
        url: "https://media.tenor.com/_PEwdam8b84AAAAM/iroh-tea.gif"
      },
    };
    return interaction.reply({ embeds: [notFirstEmbed], ephemeral: false });
  }

  const sorted = Object.entries(users).sort((a, b) => b[1].points - a[1].points);
  if (sorted.length === 0) {
    return interaction.reply({ content: 'No dragons found in the leaderboard. <:uncle_iroh_ugh:1361760723126059169>', ephemeral: true });
  }

  const [topUserId, topUserData] = sorted[0];
  const member = await interaction.guild.members.fetch(topUserId).catch(() => null);

  if (!member) {
    return interaction.reply({ content: 'Top dragon not found in this server. <:uncle_iroh_what:1361708719028568308>', ephemeral: true });
  }

  let role = interaction.guild.roles.cache.find(r => r.name === 'Dragon of The Month');
  if (!role) {
    role = await interaction.guild.roles.create({
      name: 'Dragon of The Month',
      color: 'GOLD',
      reason: 'Top dragon of the month'
    });
  }

  // Remove role from others
  interaction.guild.members.cache.forEach(m => {
    if (m.roles.cache.has(role.id) && m.id !== topUserId) {
      m.roles.remove(role).catch(console.error);
    }
  });

// Assign role to top player
await member.roles.add(role).catch(console.error);

// Crown embed for the winner (sent in DM)
const crownEmbed = {
  color: 0xFFA500,
  title: '𑁍 ⎮ Dragon of The Month',
  description: `🔥 **Congratulations** <@${topUserId}>! 🔥\n\n🔸 You’ve risen above the rest and claimed the title of *Dragon of The Month*! Well earned, my friend! <:uncle_iroh_smiling:1361699713312886976>`,
  thumbnail: {
    url: "https://64.media.tumblr.com/9df25f53d7e0707622f0872fefa1a59c/9e2d77052063fe96-94/s1280x1920/0eee2119ff4ac747913dfef0d3caabd4d5009610.gif"
  },
  footer: { text: `Awarded on ${today.toLocaleDateString()}` }
};

// Embed confirmation sent to the command user
const confirmationEmbed = {
  color: 0xFFA500,
  title: '𑁍 ⎮ Message Sent',
  description: `The title has been awarded and <@${topUserId}> has been notified in DMs. <:uncle_iroh:1361764990369136710>`,
  footer: {
    text: 'Let the new cycle begin!'
  }
};

// Try sending the DM first
try {
  const dmUser = await client.users.fetch(topUserId);
  await dmUser.send({ embeds: [crownEmbed] });
} catch (err) {
  console.error(`❌ Could not send crownEmbed DM to ${topUserId}:`, err);
  confirmationEmbed.description = `⚠️ Tried to notify <@${topUserId}> in DMs but something went wrong.`;
}

// Then send confirmation to the command issuer
await interaction.reply({ embeds: [confirmationEmbed], ephemeral: true });


  // Send announcement to specific channel
  const announceChannel = interaction.guild.channels.cache.find(ch => ch.name === 'challenge-info');
  if (announceChannel) {
    const announceEmbed = {
      color: 0xFFA500,
      title: '𑁍 ⎮ A New Challenge Begins!',
      description: `🔥 All eyes on <@${topUserId}> who has risen above the rest and claimed the title of <@&${role.id}>! 🔥\n\nA new cycle has begun — use \`/join\` to jump back into the challenge and prove your fire once again! <:uncle_iroh:1361764990369136710>`,      
      thumbnail: {
        url: "https://64.media.tumblr.com/9df25f53d7e0707622f0872fefa1a59c/9e2d77052063fe96-94/s1280x1920/0eee2119ff4ac747913dfef0d3caabd4d5009610.gif"
      },
      footer: { text: `Awarded on ${today.toLocaleDateString()}` }
    };

  announceChannel.send({
    content: `<@&1362101024994885859>`,
    embeds: [announceEmbed]
  });
}

  // Reset players.json
  const playersFilePath = path.join(__dirname, 'players.json');
  users = {};
  saveUsers();
  fs.writeFileSync(playersFilePath, '{}');


  return;
}

  
if (interaction.commandName === "pai_sho_pairs") {
  return paiShoPairs.execute(interaction, users, saveUsers);
}

});

client.login(process.env.DISCORD_TOKEN);
