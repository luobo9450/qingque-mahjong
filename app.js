(() => {
  'use strict';

  const engine = window.Mahjong;
  const maxHand = 14;
  const joker = 18;
  const suits = [
    { name: '万', key: 'wan' },
    { name: '筒', key: 'tong' },
    { name: '条', key: 'tiao' },
  ];
  const numbers = '一二三四五六七八九';
  const exampleHand = [0, 1, 2, 5, 7, 7, 10, 11, 12, 17, 18, 20, 21, 22];

  const handTiles = document.querySelector('#hand-tiles');
  const handCount = document.querySelector('#hand-count');
  const progress = document.querySelector('#hand-progress');
  const handHint = document.querySelector('#hand-hint');
  const picker = document.querySelector('#picker-grid');
  const result = document.querySelector('#result-panel');
  const undo = document.querySelector('#undo-btn');
  const clear = document.querySelector('#clear-btn');
  const example = document.querySelector('#example-btn');
  const winMode = document.querySelector('#mode-win');
  const discardMode = document.querySelector('#mode-discard');
  const sevenPairs = document.querySelector('#seven-pairs');
  const rules = document.querySelector('#rule-dialog');

  let hand = [...exampleHand];
  let isExample = true;
  let mode = 'discard';
  const history = [];

  function tileName(tile) {
    if (tile === joker) return '幺鸡（一条）';
    return numbers[tile % 9] + suits[Math.floor(tile / 9)].name;
  }

  function tileMarkup(tile, { buttonLabel, small = false } = {}) {
    const suit = suits[Math.floor(tile / 9)];
    const classes = [
      'tile',
      `tile--${suit.key}`,
      tile === joker ? 'tile--joker' : '',
      small ? 'tile--small' : '',
    ].filter(Boolean).join(' ');
    const rank = tile === joker
      ? '<svg class="icon"><use href="#icon-sparrow"/></svg>'
      : `<span class="tile__rank">${(tile % 9) + 1}</span>`;
    const face = `<span class="tile__face" aria-hidden="true">
      ${rank}
      <span class="tile__suit">${tile === joker ? '幺鸡' : suit.name}</span>
    </span>`;
    if (buttonLabel) {
      return `<button type="button" class="${classes}" data-tile="${tile}" aria-label="${buttonLabel}" title="${buttonLabel}">${face}</button>`;
    }
    return `<span class="${classes}" role="img" aria-label="${tileName(tile)}" title="${tileName(tile)}">${face}</span>`;
  }

  function countTiles() {
    const counts = Array(27).fill(0);
    for (const tile of hand) counts[tile] += 1;
    return counts;
  }

  function resultHeading(eyebrow, title, description) {
    return `<p class="result-eyebrow">${eyebrow}</p>
      <h2 class="result-title">${title}</h2>
      <p class="result-subtitle">${description}</p>`;
  }

  function waitsMarkup(waits) {
    if (waits.length === 0) return '<p class="empty-state">暂无可胡牌。</p>';
    return `<ul class="waits" aria-label="可胡的牌和剩余张数">
      ${waits.map(({ tile, remaining }) => `<li class="wait-item">
        ${tileMarkup(tile, { small: true })}
        <span class="wait-stock">${remaining} 张</span>
      </li>`).join('')}
    </ul>`;
  }

  function renderDiscardResults(options, fullJokers) {
    const discards = engine.getDiscards(hand, [], options);
    const best = discards[0];
    const topCount = discards.filter((entry) => entry.total === best.total).length;
    const complete = engine.isWinning(hand, options);
    const title = fullJokers ? '四幺鸡 · 满牌' : best.total ? '出牌建议' : '暂无听牌打法';
    let description = '按弃牌后可胡的剩余张数排序。';
    if (complete) description = '当前手牌已经能胡。下方可查看各弃牌的结果。';
    if (fullJokers) description = '手中已有四张幺鸡，满足满牌规则。';

    return `${resultHeading('打牌计算', title, description)}
      ${best.total ? `<div class="best-card">
        <div class="best-tile">${tileMarkup(best.tile)}</div>
        <div class="best-info">
          <p class="best-label">${topCount > 1 ? '并列最多' : '优先打出'}</p>
          <h3>打 ${tileName(best.tile)}</h3>
          <p>可胡 ${best.waits.length} 种</p>
        </div>
        <p class="best-count"><strong>${best.total}</strong><span> 张可胡</span></p>
      </div>
      ${waitsMarkup(best.waits)}` : ''}
      <div class="ranking" aria-label="全部弃牌对比">
        <h3 class="ranking-title">全部弃牌对比</h3>
        ${discards.map(({ tile, waits, total }, index) => `<details class="rank-row">
          <summary>
            <span class="rank-index">${index + 1}</span>
            <span class="rank-main">${tileMarkup(tile, { small: true })}<span>打 ${tileName(tile)}</span></span>
            <span class="rank-detail">${waits.length} 种</span>
            <span class="rank-total">${total} 张</span>
          </summary>
          ${waitsMarkup(waits)}
        </details>`).join('')}
      </div>`;
  }

  function renderResult(counts) {
    const options = { sevenPairs: sevenPairs.checked };
    const eyebrow = mode === 'win' ? '胡牌计算' : '打牌计算';
    const fullJokers = counts[joker] === 4;

    if (mode === 'discard' && hand.length === maxHand) {
      result.innerHTML = renderDiscardResults(options, fullJokers);
      return;
    }

    if (fullJokers) {
      const headline = resultHeading(eyebrow, '四幺鸡 · 满牌', '手中已有四张幺鸡，满足满牌规则。');
      result.innerHTML = `${headline}<div class="waits">${Array.from(
        { length: 4 },
        () => tileMarkup(joker, { small: true }),
      ).join('')}</div>`;
      return;
    }

    if (hand.length === 13) {
      const waits = engine.getWaits(hand, [], options);
      const total = waits.reduce((sum, { remaining }) => sum + remaining, 0);
      const title = waits.length ? '当前手牌已听牌' : '当前手牌未听牌';
      const description = waits.length
        ? `可胡 ${waits.length} 种牌，共剩 ${total} 张。`
        : '添入任意一张剩余的牌，都无法组成胡牌。';
      result.innerHTML = `${resultHeading(eyebrow, title, description)}
        ${waitsMarkup(waits)}
        ${mode === 'discard' ? '<p class="result-subtitle">再选一张牌即可比较出牌方案。</p>' : ''}`;
      return;
    }

    if (hand.length === maxHand) {
      const winning = engine.isWinning(hand, options);
      const title = winning ? '可以胡牌' : '这手牌暂时不能胡';
      const description = winning ? '当前 14 张手牌符合胡牌规则。' : '切换至打牌计算，可查看各弃牌的听牌结果。';
      result.innerHTML = resultHeading(eyebrow, title, description);
      return;
    }

    const description = mode === 'win'
      ? '输入 13 张查看听牌，输入 14 张判断能否胡牌。'
      : '输入 14 张手牌后，查看打哪张能胡的牌最多。';
    result.innerHTML = `${resultHeading(eyebrow, '请先选择手牌', description)}
      <div class="empty-state">已选择 ${hand.length} 张</div>`;
  }

  function render() {
    const counts = countTiles();
    const sortedHand = [...hand].sort((a, b) => a - b);
    const tiles = sortedHand.map((tile) => tileMarkup(tile, { buttonLabel: `移除${tileName(tile)}` }));
    const emptySlots = Array(maxHand - hand.length).fill('<span class="tile tile--empty" aria-hidden="true"></span>');
    handTiles.innerHTML = tiles.concat(emptySlots).join('');
    handCount.textContent = `${hand.length} / ${maxHand}`;
    progress.style.setProperty('--hand-progress', `${hand.length / maxHand * 100}%`);
    if (progress instanceof HTMLProgressElement) {
      progress.max = maxHand;
      progress.value = hand.length;
    } else {
      progress.setAttribute('aria-valuenow', hand.length);
    }
    let hint = '点击下方牌面添加，点击手牌移除。';
    if (hand.length === 13) hint = '已选 13 张，可查看当前听牌。';
    if (hand.length === maxHand) hint = '已选满 14 张，点击手牌可移除。';
    if (isExample) hint = '当前为示例牌，点击清空可录入自己的牌。';
    handHint.textContent = hint;

    for (const button of picker.querySelectorAll('button[data-tile]')) {
      const tile = Number(button.dataset.tile);
      const copies = counts[tile];
      const unavailable = hand.length === maxHand || copies === 4;
      button.setAttribute('aria-disabled', String(unavailable));
      button.classList.toggle('is-unavailable', copies === 4);
      button.classList.toggle('is-in-hand', copies > 0);
      button.querySelector('.tile__stock').textContent = copies ? String(copies) : '';
      const label = `添加${tileName(tile)}，已选 ${copies} 张`;
      button.setAttribute('aria-label', label);
      button.title = label;
    }

    undo.disabled = history.length === 0;
    clear.disabled = hand.length === 0;
    for (const [button, target] of [[winMode, 'win'], [discardMode, 'discard']]) {
      const active = mode === target;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-active', active);
    }
    renderResult(counts);
  }

  function setHand(next, showExample = false) {
    history.push({ hand, isExample });
    hand = next;
    isExample = showExample;
    render();
  }

  picker.innerHTML = suits.map(({ name, key }, suit) => `<div class="picker-row picker-row--${key}">
    <span class="suit-label suit-label--${key}">${name}</span>
    <div class="picker-tiles">
      ${Array.from({ length: 9 }, (_, rank) => {
        const tile = suit * 9 + rank;
        return tileMarkup(tile, { buttonLabel: `添加${tileName(tile)}` })
          .replace('</button>', '<span class="tile__stock" aria-hidden="true"></span></button>');
      }).join('')}
    </div>
  </div>`).join('');

  picker.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-tile]');
    if (button && button.getAttribute('aria-disabled') !== 'true') {
      setHand([...hand, Number(button.dataset.tile)]);
    }
  });

  handTiles.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-tile]');
    if (!button) return;
    const tile = Number(button.dataset.tile);
    const index = hand.indexOf(tile);
    const buttons = Array.from(handTiles.querySelectorAll('button'));
    const focusedIndex = buttons.indexOf(button);
    const restoreFocus = document.activeElement === button;
    setHand(hand.filter((_, currentIndex) => currentIndex !== index));
    if (restoreFocus) {
      const remaining = handTiles.querySelectorAll('button');
      const nextFocus = remaining[Math.min(focusedIndex, remaining.length - 1)]
        ?? picker.querySelector(`button[data-tile="${tile}"]`);
      nextFocus.focus();
    }
  });

  undo.addEventListener('click', () => {
    if (history.length > 0) {
      ({ hand, isExample } = history.pop());
      render();
    }
  });
  clear.addEventListener('click', () => setHand([]));
  example.addEventListener('click', () => setHand([...exampleHand], true));
  winMode.addEventListener('click', () => {
    mode = 'win';
    render();
  });
  discardMode.addEventListener('click', () => {
    mode = 'discard';
    render();
  });
  sevenPairs.addEventListener('change', () => renderResult(countTiles()));

  document.querySelector('#rules-btn').addEventListener('click', () => rules.showModal());
  document.querySelector('#close-rules').addEventListener('click', () => rules.close());
  rules.addEventListener('click', (event) => {
    if (event.target === rules) rules.close();
  });
  document.querySelector('#view-hand-btn').addEventListener('click', () => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelector('#hand-section').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  });

  render();
})();
