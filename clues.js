module.exports = function getClue(dr, dc) {
  const dRow = Math.abs(dr);
  const dCol = Math.abs(dc);

  const rowOptions = [
    'into the woods',
    'back the way you came',
    'into the shade',
    'down the path',
    'toward the sunny clearing',
    'closer to the stream',
    'where the trees grow thicker'
  ];

  const colOptions = [
    'past the old cedar',
    'along the rocky trail',
    'near the mossy log',
    'beside the tall grass',
    'by the broken branch',
    'around the stump',
    'along the ridge'
  ];

  const rowDir = rowOptions[Math.floor(Math.random() * rowOptions.length)];
  const colDir = colOptions[Math.floor(Math.random() * colOptions.length)];

  function describeStep(count, direction) {
    if (count === 0) return '';

    const stepVariants = {
      1: [
        `a step ${direction}`,
        `just one step ${direction}`,
        `a single pace ${direction}`
      ],
      2: [
        `two steps ${direction}`,
        `a pair of steps ${direction}`,
        `a couple of steps ${direction}`,
        `two paces ${direction}`
      ],
      3: [
        `three steps ${direction}`,
        `a few steps ${direction}`,
        `three paces ${direction}`
      ],
      4: [
        `four steps ${direction}`,
        `several steps ${direction}`,
        `not far—four paces ${direction}`,
        `a steady walk ${direction}`
      ]
    };

    if (stepVariants[count]) {
      return stepVariants[count][Math.floor(Math.random() * stepVariants[count].length)];
    }

    const generalOptions = [
      `${count} steps ${direction}`,
      `${count} paces ${direction}`,
      `${count} strides ${direction}`
    ];

    return generalOptions[Math.floor(Math.random() * generalOptions.length)];
  }

  const rowPart = describeStep(dRow, rowDir);
  const colPart = describeStep(dCol, colDir);

  const clues = [];

  if (rowPart && colPart) {
    clues.push(
      `Take ${rowPart}, then ${colPart}. I’ll be right nearby.`,
      `First, ${colPart}, then take ${rowPart}. You’re getting close.`,
      `Start with ${rowPart}, followed by ${colPart}. You’ll feel it in the air.`,
      `Try heading ${colPart}, then go ${rowPart}. I can already smell the tea.`,
      `Begin with ${rowPart}, then make your way ${colPart}. I’ll wave when I see you.`
    );
  } else if (rowPart) {
    clues.push(
      `Just take ${rowPart}. That’s all it takes.`,
      `Go ${rowPart}. I’m waiting nearby.`,
      `Only one path today — ${rowPart}. You’ll see me soon.`,
      `Head ${rowPart}. The trees will guide you.`
    );
  } else if (colPart) {
    clues.push(
      `Just take ${colPart}. That should do it.`,
      `Go ${colPart}. You’re nearly there.`,
      `Only one direction now — ${colPart}. I’m just ahead.`,
      `Head ${colPart}. The air feels different there.`
    );
  }

  return clues[Math.floor(Math.random() * clues.length)];
};
