// Catalogue rendering helpers
import { computeTier } from './utils.js';

/** Render options for packs into a select element. */
export function renderPackOptions(packs, currentPackId, select) {
  select.innerHTML = '';
  packs.forEach(pk => {
    const opt = document.createElement('option');
    opt.value = pk.id;
    opt.textContent = pk.name;
    select.appendChild(opt);
  });
  if (currentPackId) select.value = currentPackId;
}

/** Render the items list into the given element. Accepts search string, callback for add, edit, delete. */
export function renderItemsList(items, listEl, search, addCallback, editCallback, deleteCallback) {
  listEl.innerHTML = '';
  const query = (search || '').trim().toLowerCase();
  items
    .filter(item => !query || item.name.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(item => {
      const li = document.createElement('li');
      const left = document.createElement('span');
      const tier = computeTier(item, items);
      const tag = tier > 1 ? `T${tier}` : 'T1';
      left.textContent = `${item.name} (${tag})`;
      li.appendChild(left);
      const btns = document.createElement('div');
      // add
      const addBtn = document.createElement('button');
      addBtn.textContent = '+';
      addBtn.title = 'Add to job';
      addBtn.onclick = () => addCallback(item);
      // edit
      const editBtn = document.createElement('button');
      editBtn.textContent = '✏️';
      editBtn.title = 'Edit item';
      editBtn.onclick = () => editCallback(item);
      // delete
      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑️';
      delBtn.title = 'Delete item';
      delBtn.onclick = () => deleteCallback(item);
      btns.appendChild(addBtn);
      btns.appendChild(editBtn);
      btns.appendChild(delBtn);
      li.appendChild(btns);
      listEl.appendChild(li);
    });
}

/** Render the job list into the given element. Accept callbacks for opening and deleting jobs. */
export function renderJobsList(jobs, listEl, openCallback, deleteCallback) {
  listEl.innerHTML = '';
  jobs
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(job => {
      const li = document.createElement('li');
      const nameSpan = document.createElement('span');
      nameSpan.textContent = job.name;
      li.appendChild(nameSpan);
      const btns = document.createElement('div');
      const openBtn = document.createElement('button');
      openBtn.textContent = '📂';
      openBtn.title = 'Open job';
      openBtn.onclick = () => openCallback(job);
      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑️';
      delBtn.title = 'Delete job';
      delBtn.onclick = () => deleteCallback(job);
      btns.appendChild(openBtn);
      btns.appendChild(delBtn);
      li.appendChild(btns);
      listEl.appendChild(li);
    });
}
