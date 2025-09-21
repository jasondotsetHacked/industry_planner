// Item editor component
import { saveRecord, generateId } from './db.js';
import { buildItemSelect } from './utils.js';

/**
 * Build an item editor card. Accepts an optional editingItem (object with id, name,
 * outputQty, inputs), the current packId, a list of items, and callbacks.
 * onSave(item) will be called with the saved object when the user hits Save.
 * onCancel() will be called when the user cancels editing.
 */
export function buildItemEditor(editingItem, currentPackId, items, onSave, onCancel) {
  const card = document.createElement('div');
  card.className = 'card';
  const title = document.createElement('h2');
  title.textContent = editingItem && editingItem.id ? 'Edit Item' : 'New Item';
  card.appendChild(title);
  const form = document.createElement('div');
  form.className = 'form';
  // Name row
  const nameRow = document.createElement('div');
  nameRow.className = 'form-row full';
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Name';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'e.g., Capacitor Battery I';
  nameInput.value = editingItem ? editingItem.name : '';
  nameRow.appendChild(nameLabel);
  nameRow.appendChild(nameInput);
  form.appendChild(nameRow);
  // Output quantity
  const qtyRow = document.createElement('div');
  qtyRow.className = 'form-row full';
  const qtyDiv = document.createElement('div');
  const qtyLabel = document.createElement('label');
  qtyLabel.textContent = 'Output Qty per Craft';
  const qtyInput = document.createElement('input');
  qtyInput.type = 'number';
  qtyInput.min = '0.0001';
  qtyInput.step = '0.0001';
  qtyInput.placeholder = '1';
  qtyInput.value = editingItem ? editingItem.outputQty : 1;
  qtyDiv.appendChild(qtyLabel);
  qtyDiv.appendChild(qtyInput);
  qtyRow.appendChild(qtyDiv);
  form.appendChild(qtyRow);
  // Inputs section
  const inputsSection = document.createElement('div');
  inputsSection.className = 'inputs-list';
  const inputsLabel = document.createElement('label');
  inputsLabel.textContent = 'Inputs';
  inputsSection.appendChild(inputsLabel);
  const inputsContainer = document.createElement('div');
  inputsSection.appendChild(inputsContainer);
  const addRowBtn = document.createElement('button');
  addRowBtn.textContent = 'Add Input';
  addRowBtn.className = 'add-row small';
  addRowBtn.type = 'button';
  addRowBtn.onclick = () => appendInputRow();
  inputsSection.appendChild(addRowBtn);
  form.appendChild(inputsSection);
  // Append a row helper
  function appendInputRow(input = {}) {
    const row = document.createElement('div');
    row.className = 'input-row';
    const selWrapper = document.createElement('div');
    const selLabel = document.createElement('label');
    selLabel.textContent = 'Input Item';
    const sel = buildItemSelect(items, input.itemId);
    selWrapper.appendChild(selLabel);
    selWrapper.appendChild(sel);
    const qtyWrapper = document.createElement('div');
    const qtyLabel2 = document.createElement('label');
    qtyLabel2.textContent = 'Quantity';
    const qtyField = document.createElement('input');
    qtyField.type = 'number';
    qtyField.min = '0.0001';
    qtyField.step = '0.0001';
    qtyField.value = input.qty || 1;
    qtyWrapper.appendChild(qtyLabel2);
    qtyWrapper.appendChild(qtyField);
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'remove-row';
    removeBtn.onclick = () => {
      inputsContainer.removeChild(row);
    };
    row.appendChild(selWrapper);
    row.appendChild(qtyWrapper);
    row.appendChild(removeBtn);
    inputsContainer.appendChild(row);
  }
  // Prepopulate existing inputs
  if (editingItem && editingItem.inputs && editingItem.inputs.length) {
    editingItem.inputs.forEach(inp => appendInputRow(inp));
  }
  // Action buttons
  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '0.5rem';
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.onclick = async () => {
    const name = nameInput.value.trim();
    if (!name) {
      alert('Name is required');
      return;
    }
    const outQty = parseFloat(qtyInput.value) || 1;
    const inputs = [];
    Array.from(inputsContainer.children).forEach(row => {
      const sel = row.querySelector('select');
      const qtyField = row.querySelector('input[type="number"]');
      const id = sel.value;
      const qVal = parseFloat(qtyField.value) || 0;
      if (id && qVal > 0) inputs.push({ itemId: id, qty: qVal });
    });
    const obj = editingItem && editingItem.id ? editingItem : { id: generateId(), packId: currentPackId };
    obj.name = name;
    obj.outputQty = outQty;
    delete obj.time;
    obj.inputs = inputs;
    await saveRecord('items', obj);
    if (onSave) onSave(obj);
  };
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'secondary';
  cancelBtn.onclick = () => {
    if (onCancel) onCancel();
  };
  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);
  form.appendChild(actions);
  card.appendChild(form);
  return card;
}
