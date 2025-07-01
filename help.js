//help.js
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

module.exports = {
  name: 'help',
  async execute(interaction) {
    const botAvatarURL = interaction.client.user.displayAvatarURL({ dynamic: true, size: 256 });

    const helpEmbeds = [
      new MessageEmbed()
        .setColor(0xFFA500)
        .setTitle('𑁍 ⎮ Help - Page 1')
        .setDescription(
          `This bot is created by **<@707124653482836009>**, inspired by the scene from the *Netflix Live-Action Avatar: The Last Airbender*. Zuko finds the White Lotus tile and uses it to find his Uncle Iroh — and now, so can you. <:uncle_iroh_smiling:1361699713312886976>\n\n- **Page 1 ➤ Commands**\n- **Page 2 ➤ Find Uncle Iroh**\n- **Page 3 ➤ Pai Sho Pairs**\n- **Page 4 ➤ Cooldown Info**\n- **Page 5 ➤ Monthly Challenge Info**\n`
        )
        .addFields({
          name: '🧭 ➤ Commands',
          value:
            '🔸 `/join` — Join the <@&1362101024994885859>.\n' +
            '🔸 `/find_uncle_iroh` — Start a **1-min** round to find Iroh.\n' +
            '🔸 `/pai_sho_pairs` — Start a **5-min** Pai Sho Pairs game.\n' +
            '🔸 `/leaderboard` — See the **top dragons**.\n' +
            '🔸 `/help` — Show this **help** message.'
        })
        .setFooter({ text: 'Even in darkness, there is guidance... and tea!' }),

      new MessageEmbed()
        .setColor(0xFFA500)
        .setTitle('𑁍 ⎮ Help - Page 2')
        .addFields({
          name: '🔍 ➤ Find Uncle Iroh',
          value:
            '🔸 A Lotus tile is placed **randomly** on a 5x5 grid.\n' +
            '🔸 You receive a **clue** to Iroh’s location relative to the Lotus.\n' +
            '🔸 Guess the **right location** to earn points!'
        })
        .setFooter({ text: 'Even in darkness, there is guidance... and tea!' }),

      new MessageEmbed()
        .setColor(0xFFA500)
        .setTitle('𑁍 ⎮ Help - Page 3')
        .addFields({
          name: '♟️ ➤ Pai Sho Pairs',
          value:
            '🔸 **Flip tiles** to find all matching pairs as fast as you can.\n' +
            '🔸 Earn **5 points** for every finished game!\n' +
            '🔸 If time runs out, you **lose** those 5 points.'
        })
        .setFooter({ text: 'Even in darkness, there is guidance... and tea!' }),

      new MessageEmbed()
        .setColor(0xFFA500)
        .setTitle('𑁍 ⎮ Help - Page 4')
        .addFields({
          name: '⏱️ ➤ Cooldown Info',
          value:
            '🔸 You can use `/find-uncle-iroh` up to **10 times** in a row.\n' +
            '🔸 Then you’ll need to wait **less than 5 hours** before continuing.\n' +
            '🔸 There is **no cooldown** for the Pai Sho Pairs game.'
        })
        .setFooter({ text: 'Even in darkness, there is guidance... and tea!' }),

      new MessageEmbed()
        .setColor(0xFFA500)
        .setTitle('𑁍 ⎮ Help - Page 5')
        .addFields({
          name: '🥇 ➤ Monthly Challenge Info',
          value:
            '🔸 The **#1 dragon** earns the <@&1361436679843352617> title.\n' +
            '🔸 They keep it for **1 month**, then it passes to the next dragon.\n' +
            '🔸 Only <@707124653482836009> can give the title using `/reward`.\n' +
            '🔸 The winner will get a DM from the bot and a public shoutout in <#1361443929593217024>.\n' +
            '🔸 The leaderboard **resets monthly** — you’ll need to join again!'
        })
        .setFooter({ text: 'Even in darkness, there is guidance... and tea!' })
    ];

    const createButtons = (page) => {
      return new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId('prev')
          .setLabel('◀️ Previous')
          .setStyle('PRIMARY')
          .setDisabled(page === 0),
        new MessageButton()
          .setCustomId('next')
          .setLabel('Next ▶️')
          .setStyle('PRIMARY')
          .setDisabled(page === helpEmbeds.length - 1)
      );
    };

    let page = 0;

    const reply = await interaction.reply({
      embeds: [helpEmbeds[page]],
      components: [createButtons(page)],
      ephemeral: false,
      fetchReply: true
    });

    if (reply._collectorAlreadySet) return;
    reply._collectorAlreadySet = true;

    const collector = reply.createMessageComponentCollector({
      time: 60000,
      filter: (i) => i.user.id === interaction.user.id
    });

const handledInteractions = new Set();
collector.on('collect', async (i) => {
  if (handledInteractions.has(i.id)) return; // skip if already handled
  handledInteractions.add(i.id); // mark as handled

  try {
    if (i.customId === 'next') page++;
    if (i.customId === 'prev') page--;

    const updatedRow = createButtons(page);

    await i.update({
      embeds: [helpEmbeds[page]],
      components: [updatedRow]
    });
    
const isEphemeral = false;

// Remove the setTimeout if it's an ephemeral message
if (!isEphemeral) {
  setTimeout(async () => {
    try {
      await reply.edit({
        components: [createButtons(page)]
      });
    } catch (e) {
      if (e.code !== 10008) {
        console.warn('Re-enable edit failed:', e.message);
      }
    }
  }, 250);
}


  } catch (err) {
    console.warn('Interaction update failed:', err);
  }
});




    collector.on('end', async () => {
      const disabledButtons = createButtons(page);
      disabledButtons.components.forEach((b) => b.setDisabled(true));

      await reply.edit({
        components: [disabledButtons]
      });
    });
  }
 };