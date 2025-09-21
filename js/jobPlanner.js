// Job planner component
import { saveRecord, generateId } from './db.js';
import { expandItem, formatTree, buildItemSelect } from './utils.js';

/** Plan a job given lines and items. Returns totals and breakdown trees. */
export function planJob(lines, items) {
  const totals = {};
  const trees = [];

  lines.forEach(line => {
    const res = expandItem(line.itemId, line.qty, items, new Set());
    Object.entries(res.totals).forEach(([id, qty]) => {
      totals[id] = (totals[id] || 0) + qty;
    });
    if (res.tree && Object.keys(res.tree).length) {
      trees.push(res.tree);
    }
  });

  return { totals, trees };
}

/** Build a job planner card. Accepts an editingJob (optional), a jobCart object (lines), the items list,
 * currentPackId and callbacks onSave(job), onCancel().
 */
export function buildJobPlanner(editingJob, jobCart, items, currentPackId, onSave, onCancel) {
  const card = document.createElement('div');
  card.className = 'card';
  const title = document.createElement('h2');
  title.textContent = editingJob && editingJob.id ? 'Edit Job' : 'New Job';
  card.appendChild(title);
  const form = document.createElement('div');
  // Job name
  const nameRow = document.createElement('div');
  nameRow.className = 'form-row full';
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Job Name';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'e.g., Battleship Build';
  nameInput.value = editingJob ? editingJob.name : '';
  nameRow.appendChild(nameLabel);
  nameRow.appendChild(nameInput);
  form.appendChild(nameRow);
  // Lines section
  const linesSection = document.createElement('div');
  linesSection.className = 'job-lines';
  const linesLabel = document.createElement('label');
  linesLabel.textContent = 'Lines';
  linesSection.appendChild(linesLabel);
  const linesContainer = document.createElement('div');
  linesSection.appendChild(linesContainer);
  const addLineBtn = document.createElement('button');
  addLineBtn.textContent = 'Add Line';
  addLineBtn.className = 'add-line small';
  addLineBtn.type = 'button';
  addLineBtn.onclick = () => appendLineRow();
  linesSection.appendChild(addLineBtn);
  form.appendChild(linesSection);
  // Append line helper
  function appendLineRow(line = {}) {
    const row = document.createElement('div');
    row.className = 'job-line';
    const sel = buildItemSelect(items, line.itemId);
    const qty = document.createElement('input');
    qty.type = 'number';
    qty.min = '0.0001';
    qty.step = '0.0001';
    qty.value = line.qty || 1;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'x';
    removeBtn.className = 'remove-line';
    removeBtn.onclick = () => {
      linesContainer.removeChild(row);
    };
    row.appendChild(sel);
    row.appendChild(qty);
    row.appendChild(removeBtn);
    linesContainer.appendChild(row);
  }
  // Prepopulate existing lines
  if (jobCart.lines && jobCart.lines.length) {
    jobCart.lines.forEach(line => appendLineRow(line));
  }
  // Result display
  const resultBox = document.createElement('div');
  resultBox.id = 'planResults';
  resultBox.textContent = 'Plan totals to see results.';
  form.appendChild(resultBox);
  if (jobCart.lines && jobCart.lines.length) {
    const initialPlan = planJob(jobCart.lines, items);
    if (Object.keys(initialPlan.totals).length || initialPlan.trees.length) {
      renderPlanResults(initialPlan);
    }
  }
  // Actions
  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '0.5rem';
  // Plan
  const planBtn = document.createElement('button');
  planBtn.textContent = 'Plan';
  planBtn.onclick = () => {
    jobCart.lines = [];
    Array.from(linesContainer.children).forEach(row => {
      const sel = row.querySelector('select');
      const qtyField = row.querySelector('input[type="number"]');
      const id = sel.value;
      const qtyVal = parseFloat(qtyField.value) || 0;
      if (id && qtyVal > 0) jobCart.lines.push({ itemId: id, qty: qtyVal });
    });
    if (!jobCart.lines.length) {
      resultBox.innerHTML = '';
      resultBox.textContent = 'Add at least one line to plan totals.';
      return;
    }
    const plan = planJob(jobCart.lines, items);
    renderPlanResults(plan);
  };
  // Save
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save Job';
  saveBtn.onclick = async () => {
    jobCart.lines = [];
    Array.from(linesContainer.children).forEach(row => {
      const sel = row.querySelector('select');
      const qtyField = row.querySelector('input[type="number"]');
      const id = sel.value;
      const qtyVal = parseFloat(qtyField.value) || 0;
      if (id && qtyVal > 0) jobCart.lines.push({ itemId: id, qty: qtyVal });
    });
    if (!jobCart.lines.length) {
      alert('Add at least one line');
      return;
    }
    const name = nameInput.value.trim();
    if (!name) {
      alert('Job name required');
      return;
    }
    const obj = editingJob && editingJob.id ? editingJob : { id: generateId(), packId: currentPackId };
    obj.name = name;
    obj.lines = jobCart.lines;
    delete obj.stations;
    delete obj.speed;
    await saveRecord('jobs', obj);
    if (onSave) onSave(obj);
  };
  // Cancel
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'secondary';
  cancelBtn.onclick = () => {
    if (onCancel) onCancel();
  };
  actions.appendChild(planBtn);
  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);
  form.appendChild(actions);
  card.appendChild(form);
  // Helper to render plan results
  function renderPlanResults(plan) {
    resultBox.innerHTML = '';
    if (!plan) {
      resultBox.textContent = 'No totals to display.';
      return;
    }
    const hasTotals = Object.keys(plan.totals).length > 0;
    const hasBreakdown = plan.trees.length > 0;
    if (!hasTotals && !hasBreakdown) {
      resultBox.textContent = 'No totals to display.';
      return;
    }
    const res = document.createElement('div');
    res.className = 'plan-results';
    let html = '';
    if (hasTotals) {
      html += '<strong>Totals:</strong><br>';
      const lines = [];
      Object.entries(plan.totals).forEach(([id, qty]) => {
        const item = items.find(i => i.id === id);
        lines.push(`${item ? item.name : id} x ${parseFloat(qty.toFixed(2))}`);
      });
      html += lines.join('<br>');
    }
    if (hasBreakdown) {
      if (hasTotals) html += '<br><br>';
      html += '<strong>Breakdown:</strong><pre>';
      plan.trees.forEach(tree => {
        html += formatTree(tree);
      });
      html += '</pre>';
    }
    res.innerHTML = html;
    resultBox.appendChild(res);
  }
  return card;
}
