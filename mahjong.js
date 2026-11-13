(function (root) {
  "use strict";

  const TILE_COUNT = 27;
  const WILDCARD = 18;
  const COPIES = 4;

  function countTiles(tiles) {
    if (!Array.isArray(tiles)) return null;

    const counts = Array(TILE_COUNT).fill(0);
    for (const tile of tiles) {
      if (!Number.isInteger(tile) || tile < 0 || tile >= TILE_COUNT) return null;
      counts[tile]++;
      if (counts[tile] > COPIES) return null;
    }
    return counts;
  }

  function canFormMelds(counts, wildcards, memo) {
    const first = counts.findIndex(Boolean);
    if (first === -1) return wildcards % 3 === 0;

    const key = counts.join("") + wildcards;
    if (memo.has(key)) return memo.get(key);

    // A matching natural tile can replace a wildcard in the current meld.
    // The wildcard can then stand in for that natural tile in a later meld.
    const triplet = Math.min(3, counts[first]);
    const missingTripletTiles = 3 - triplet;
    if (missingTripletTiles <= wildcards) {
      counts[first] -= triplet;
      const works = canFormMelds(counts, wildcards - missingTripletTiles, memo);
      counts[first] += triplet;
      if (works) {
        memo.set(key, true);
        return true;
      }
    }

    const suitStart = first - first % 9;
    const startMin = Math.max(suitStart, first - 2);
    const startMax = Math.min(suitStart + 6, first);
    for (let start = startMin; start <= startMax; start++) {
      const naturalTiles = [];
      for (let tile = start; tile < start + 3; tile++) {
        if (counts[tile] > 0) naturalTiles.push(tile);
      }
      const missingSequenceTiles = 3 - naturalTiles.length;
      if (missingSequenceTiles > wildcards) continue;

      for (const tile of naturalTiles) counts[tile]--;
      const works = canFormMelds(counts, wildcards - missingSequenceTiles, memo);
      for (const tile of naturalTiles) counts[tile]++;
      if (works) {
        memo.set(key, true);
        return true;
      }
    }

    memo.set(key, false);
    return false;
  }

  function wins(counts, options, memo) {
    const wildcards = counts[WILDCARD];
    if (wildcards === COPIES) return true;

    counts[WILDCARD] = 0;
    try {
      if (options?.sevenPairs) {
        const unpaired = counts.reduce((sum, count) => sum + count % 2, 0);
        if (unpaired <= wildcards) return true;
      }

      for (let tile = 0; tile < TILE_COUNT; tile++) {
        if (counts[tile] === 0) continue;
        const pair = Math.min(2, counts[tile]);
        const missingPairTiles = 2 - pair;
        if (missingPairTiles > wildcards) continue;

        counts[tile] -= pair;
        const works = canFormMelds(counts, wildcards - missingPairTiles, memo);
        counts[tile] += pair;
        if (works) return true;
      }
      return wildcards >= 2 && canFormMelds(counts, wildcards - 2, memo);
    } finally {
      counts[WILDCARD] = wildcards;
    }
  }

  function isWinning(hand, options) {
    const counts = countTiles(hand);
    return Boolean(counts && hand.length === 14 && wins(counts, options, new Map()));
  }

  function getAvailableCounts(counts, unavailable) {
    const dead = countTiles(unavailable);
    if (!dead) return null;

    const available = counts.map((count, tile) => COPIES - count - dead[tile]);
    return available.some(count => count < 0) ? null : available;
  }

  function findWaits(counts, available, options, memo) {
    const waits = [];
    for (let tile = 0; tile < TILE_COUNT; tile++) {
      if (available[tile] === 0) continue;

      counts[tile]++;
      const winning = wins(counts, options, memo);
      counts[tile]--;
      if (winning) waits.push({ tile, remaining: available[tile] });
    }
    return waits;
  }

  function getWaits(hand, unavailable = [], options) {
    const counts = countTiles(hand);
    if (!counts || hand.length !== 13) return [];

    const available = getAvailableCounts(counts, unavailable);
    return available ? findWaits(counts, available, options, new Map()) : [];
  }

  function getDiscards(hand, unavailable = [], options) {
    const counts = countTiles(hand);
    if (!counts || hand.length !== 14) return [];

    // Every tile in the original hand is still accounted for after a discard.
    const available = getAvailableCounts(counts, unavailable);
    if (!available) return [];

    const discards = [];
    const memo = new Map();
    for (let tile = 0; tile < TILE_COUNT; tile++) {
      if (counts[tile] === 0) continue;

      counts[tile]--;
      const waits = findWaits(counts, available, options, memo);
      counts[tile]++;
      discards.push({
        tile,
        waits,
        total: waits.reduce((sum, wait) => sum + wait.remaining, 0)
      });
    }
    return discards.sort((a, b) => b.total - a.total || b.waits.length - a.waits.length || a.tile - b.tile);
  }

  const Mahjong = { isWinning, getWaits, getDiscards };
  if (typeof module === "object" && module.exports) module.exports = Mahjong;
  else root.Mahjong = Mahjong;
})(globalThis);
