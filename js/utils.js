// Utility functions for Industry Planner

/** Compute the tier (depth) of an item recursively. */
export function computeTier(item, items, seen = new Set()) {
  if (!item || !item.inputs || item.inputs.length === 0) return 1;
  if (seen.has(item.id)) return 1; // break cycles
  seen.add(item.id);
  const depths = item.inputs.map(inp => {
    const child = items.find(i => i.id === inp.itemId);
    return computeTier(child, items, seen);
  });
  return 1 + (depths.length ? Math.max(...depths) : 0);
}

/** Expand a given item into primitive materials. Returns {totals, tree}. */
export function expandItem(itemId, quantity, items, visited = new Set()) {
  const result = { totals: {}, tree: {} };
  const item = items.find(i => i.id === itemId);
  if (!item) return result;
  // cycle guard
  if (visited.has(itemId)) {
    result.totals[itemId] = (result.totals[itemId] || 0) + quantity;
    return result;
  }
  if (!item.inputs || item.inputs.length === 0) {
    result.totals[itemId] = (result.totals[itemId] || 0) + quantity;
    result.tree = { name: item.name, qty: quantity };
    return result;
  }
  const runs = quantity / (item.outputQty || 1);
  const node = { name: item.name, qty: quantity, inputs: [] };
  visited.add(itemId);
  for (const input of item.inputs) {
    const sub = expandItem(input.itemId, input.qty * runs, items, visited);
    for (const [k, v] of Object.entries(sub.totals)) {
      result.totals[k] = (result.totals[k] || 0) + v;
    }
    if (sub.tree && Object.keys(sub.tree).length) {
      node.inputs.push(sub.tree);
    }
  }
  visited.delete(itemId);
  result.tree = node;
  return result;
}

/** Format the breakdown tree into a readable indented string. */
export function formatTree(node, depth = 0) {
  if (!node) return '';
  const indent = '  '.repeat(depth);
  let line = `${indent}- ${node.name} x ${parseFloat(node.qty.toFixed(2))}\n`;
  if (node.inputs && node.inputs.length) {
    for (const child of node.inputs) {
      line += formatTree(child, depth + 1);
    }
  }
  return line;
}

/** Build a select element populated with items of the current pack. */
export function buildItemSelect(items, selectedId) {
  const select = document.createElement('select');
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '-- select item --';
  select.appendChild(empty);
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.name;
    if (item.id === selectedId) opt.selected = true;
    select.appendChild(opt);
  });
  return select;
}
