import { openDatabase, getAll, saveRecord, deleteRecord, clearStores, generateId } from './db.js';
import { renderPackOptions, renderItemsList, renderJobsList } from './catalog.js';
import { buildItemEditor } from './itemEditor.js';
import { buildJobPlanner } from './jobPlanner.js';

// Application state
let packs = [];
let items = [];
let jobs = [];
let currentPackId = null;
let currentView = null; // null | 'item' | 'job'
let editingItem = null;
let editingJob = null;
let jobCart = { lines: [], stations: 1, speed: 1 };

/** Load packs from DB, creating sample packs if none exist. */
async function loadPacks() {
  packs = await getAll('packs');
  if (packs.length === 0) {
    // create sample packs and items
    const eveId = generateId();
    const mcId = generateId();
    await saveRecord('packs', { id: eveId, name: 'EVE Online' });
    await saveRecord('packs', { id: mcId, name: 'Minecraft' });
    // EVE items
    await saveRecord('items', { id: generateId(), packId: eveId, name: 'Tritanium', outputQty: 1, time: 0, inputs: [] });
    await saveRecord('items', { id: generateId(), packId: eveId, name: 'Pyerite', outputQty: 1, time: 0, inputs: [] });
    await saveRecord('items', { id: generateId(), packId: eveId, name: 'Capacitor Battery I', outputQty: 1, time: 60, inputs: [] });
    // Minecraft items
    await saveRecord('items', { id: generateId(), packId: mcId, name: 'Wood Plank', outputQty: 4, time: 0, inputs: [] });
    await saveRecord('items', { id: generateId(), packId: mcId, name: 'Stick', outputQty: 4, time: 0, inputs: [] });
    await saveRecord('items', { id: generateId(), packId: mcId, name: 'Stone Pickaxe', outputQty: 1, time: 0, inputs: [] });
    packs = await getAll('packs');
  }
  if (!currentPackId && packs.length) currentPackId = packs[0].id;
  const packSelect = document.getElementById('packSelect');
  renderPackOptions(packs, currentPackId, packSelect);
}

/** Load items and jobs for the current pack. */
async function loadItemsAndJobs() {
  if (!currentPackId) return;
  items = await getAll('items', rec => rec.packId === currentPackId);
  jobs = await getAll('jobs', rec => rec.packId === currentPackId);
}

/** Render the catalogue lists (items and jobs). */
function renderCatalogue() {
  // Items
  const itemList = document.getElementById('itemList');
  const searchVal = document.getElementById('searchInput').value;
  renderItemsList(items, itemList, searchVal, (item) => {
    // add to job callback
    jobCart.lines.push({ itemId: item.id, qty: 1 });
    currentView = 'job';
    renderContent();
    toggleCatalog(false);
  }, (item) => {
    // edit item callback
    editingItem = JSON.parse(JSON.stringify(item));
    currentView = 'item';
    renderContent();
    toggleCatalog(false);
  }, async (item) => {
    // delete item callback
    if (confirm('Delete this item?')) {
      await deleteRecord('items', item.id);
      await loadItemsAndJobs();
      renderCatalogue();
      if (currentView === 'job') {
        // refresh jobs list
        renderCatalogue();
      }
      renderContent();
    }
  });
  // Jobs
  const jobList = document.getElementById('jobList');
  renderJobsList(jobs, jobList, (job) => {
    // open job
    editingJob = JSON.parse(JSON.stringify(job));
    jobCart = { lines: [...editingJob.lines], stations: editingJob.stations || 1, speed: editingJob.speed || 1 };
    currentView = 'job';
    renderContent();
    toggleCatalog(false);
  }, async (job) => {
    if (confirm('Delete this job?')) {
      await deleteRecord('jobs', job.id);
      await loadItemsAndJobs();
      renderCatalogue();
      if (currentView === 'job') {
        renderContent();
      }
    }
  });
}

/** Render the main content based on currentView state. */
function renderContent() {
  const container = document.getElementById('content');
  container.innerHTML = '';
  if (!currentView) {
    const card = document.createElement('div');
    card.className = 'card';
    const h2 = document.createElement('h2');
    h2.textContent = 'Welcome';
    const p = document.createElement('p');
    p.textContent = 'Select or create an item or job from the catalogue to begin.';
    card.appendChild(h2);
    card.appendChild(p);
    container.appendChild(card);
    return;
  }
  if (currentView === 'item') {
    const editor = buildItemEditor(editingItem, currentPackId, items, async (saved) => {
      // onSave
      await loadItemsAndJobs();
      editingItem = null;
      currentView = null;
      renderCatalogue();
      renderContent();
    }, () => {
      editingItem = null;
      currentView = null;
      renderContent();
    });
    container.appendChild(editor);
  } else if (currentView === 'job') {
    const planner = buildJobPlanner(editingJob, jobCart, items, currentPackId, async (saved) => {
      // onSave job
      await loadItemsAndJobs();
      editingJob = null;
      jobCart = { lines: [], stations: 1, speed: 1 };
      currentView = null;
      renderCatalogue();
      renderContent();
    }, () => {
      editingJob = null;
      jobCart = { lines: [], stations: 1, speed: 1 };
      currentView = null;
      renderContent();
    });
    container.appendChild(planner);
  }
}

/** Toggle the mobile catalogue drawer. */
function toggleCatalog(open) {
  if (open) document.body.classList.add('show-catalog');
  else document.body.classList.remove('show-catalog');
}

/** Setup event listeners for header and catalogue controls. */
function setupEventListeners() {
  // Pack select change
  const packSelect = document.getElementById('packSelect');
  packSelect.onchange = async () => {
    currentPackId = packSelect.value;
    await loadItemsAndJobs();
    editingItem = null;
    editingJob = null;
    currentView = null;
    jobCart = { lines: [], stations: 1, speed: 1 };
    renderPackOptions(packs, currentPackId, packSelect);
    renderCatalogue();
    renderContent();
  };
  // New game
  document.getElementById('newPackBtn').onclick = async () => {
    const name = prompt('Enter new game name');
    if (name) {
      const id = generateId();
      await saveRecord('packs', { id, name });
      packs.push({ id, name });
      currentPackId = id;
      items = [];
      jobs = [];
      renderPackOptions(packs, currentPackId, packSelect);
      renderCatalogue();
      renderContent();
    }
  };
  // New item
  document.getElementById('newItemBtn').onclick = () => {
    editingItem = { id: null, packId: currentPackId, name: '', outputQty: 1, time: 0, inputs: [] };
    currentView = 'item';
    renderContent();
    toggleCatalog(false);
  };
  // New job
  document.getElementById('newJobBtn').onclick = () => {
    editingJob = null;
    jobCart = { lines: [], stations: 1, speed: 1 };
    currentView = 'job';
    renderContent();
    toggleCatalog(false);
  };
  // Search input
  document.getElementById('searchInput').oninput = () => {
    renderCatalogue();
  };
  // Export all
  document.getElementById('exportAllBtn').onclick = async () => {
    const allPacks = await getAll('packs');
    const allItems = await getAll('items');
    const allJobs = await getAll('jobs');
    const data = { packs: allPacks, items: allItems, jobs: allJobs };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'industry-planner-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  // Import
  document.getElementById('importBtn').onclick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';
    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (data.packs && data.items && data.jobs) {
          await clearStores();
          for (const pk of data.packs) await saveRecord('packs', pk);
          for (const it of data.items) await saveRecord('items', it);
          for (const job of data.jobs) await saveRecord('jobs', job);
          await loadPacks();
          await loadItemsAndJobs();
          editingItem = null;
          editingJob = null;
          jobCart = { lines: [], stations: 1, speed: 1 };
          currentView = null;
          renderPackOptions(packs, currentPackId, packSelect);
          renderCatalogue();
          renderContent();
          alert('Import successful');
        } else {
          alert('Invalid file');
        }
      } catch (ex) {
        alert('Failed to import');
      }
    };
    fileInput.click();
  };
  // Mobile catalogue toggle
  document.getElementById('catalogBtn').onclick = () => {
    toggleCatalog(true);
  };
  // Click outside to close catalogue
  document.addEventListener('click', (e) => {
    if (document.body.classList.contains('show-catalog')) {
      const aside = document.getElementById('catalog');
      if (!aside.contains(e.target) && e.target.id !== 'catalogBtn') {
        toggleCatalog(false);
      }
    }
  });
}

/** Initialise the application. */
(async function init() {
  await openDatabase();
  await loadPacks();
  await loadItemsAndJobs();
  renderCatalogue();
  renderContent();
  setupEventListeners();
})();
