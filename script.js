/*********************/
/* Globális változók */
/*********************/
let bubbles = [];
let connections = [];
let focusBubbleId = null;
let searchQuery = "";

let isDragging = false,
    draggedBubble = null,
    dragOffset = { x: 0, y: 0 };

let isPanning = false,
    panStart = { x: 0, y: 0 };

let offsetX = 0,
    offsetY = 0,
    scale = 1;

let connectMode = false;
let connectionStartBubble = null;

/*******************/
/* Canvas beállítás*/
/*******************/
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

// Vászon újraméretezése
function resizeCanvas() {
  canvas.width = document.getElementById('canvas-container').clientWidth;
  canvas.height = document.getElementById('canvas-container').clientHeight;
  render();
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

/*************************/
/* LocalStorage kezelése */
/*************************/
function loadData() {
  const data = localStorage.getItem("mindMapData");
  if (data) {
    try {
      let parsed = JSON.parse(data);
      bubbles = parsed.bubbles || [];
      connections = parsed.connections || [];
    } catch (err) {
      bubbles = [];
      connections = [];
    }
  }
}
loadData();

function saveData() {
  const data = { bubbles, connections };
  localStorage.setItem("mindMapData", JSON.stringify(data));
}

/*************************/
/* Segédfüggvények       */
/*************************/
// Véletlenszerű szín választása
function getRandomColor() {
  const colors = ['#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9', '#92A8D1'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Egy egységes függvény a képernyő koordináták átalakítására
function getPointerPosition(e) {
  let clientX, clientY;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  return { clientX, clientY };
}

// A vászon koordinátáit átalakítja világkoordinátákká a pan/zoom miatt
function getBubbleAt(screenX, screenY) {
  const tx = (screenX - offsetX) / scale;
  const ty = (screenY - offsetY) / scale;
  for (let bubble of bubbles) {
    if (Math.hypot(bubble.x - tx, bubble.y - ty) < 40)
      return bubble;
  }
  return null;
}

/*************************/
/* Egér és touch események */
/*************************/

// MÁSI uses mouse eseményeket
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  let bubble = getBubbleAt(x, y);
  if (bubble) {
    if (connectMode) {
      if (!connectionStartBubble) {
        connectionStartBubble = bubble;
        canvas.style.cursor = 'crosshair';
      } else if (connectionStartBubble.id !== bubble.id) {
        connections.push({ from: connectionStartBubble.id, to: bubble.id });
        connectionStartBubble = null;
        saveData();
        render();
      }
    } else {
      isDragging = true;
      draggedBubble = bubble;
      const worldX = (x - offsetX) / scale;
      const worldY = (y - offsetY) / scale;
      dragOffset.x = worldX - bubble.x;
      dragOffset.y = worldY - bubble.y;
    }
  } else {
    isPanning = true;
    panStart.x = e.clientX;
    panStart.y = e.clientY;
    canvas.style.cursor = 'grabbing';
  }
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  if (isDragging && draggedBubble) {
    const worldX = (x - offsetX) / scale;
    const worldY = (y - offsetY) / scale;
    draggedBubble.x = worldX - dragOffset.x;
    draggedBubble.y = worldY - dragOffset.y;
    render();
  } else if (isPanning) {
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    offsetX += dx;
    offsetY += dy;
    panStart.x = e.clientX;
    panStart.y = e.clientY;
    render();
  }
});

canvas.addEventListener('mouseup', (e) => {
  isDragging = false;
  draggedBubble = null;
  isPanning = false;
  canvas.style.cursor = 'grab';
});

// Zoomolás görgetéssel: a kurzor pozícióját középpontnak veszi
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  let zoom = e.deltaY < 0 ? 1.1 : 0.9;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  offsetX = x - zoom * (x - offsetX);
  offsetY = y - zoom * (y - offsetY);
  scale *= zoom;
  render();
});

// Dupla kattintás: focus mód (csak a kiválasztott buborék és kapcsolódói)
canvas.addEventListener('dblclick', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const bubble = getBubbleAt(x, y);
  if (bubble) {
    focusBubbleId = bubble.id;
    document.getElementById('exitFocus').style.display = 'inline-block';
    render();
  }
});

// Jobb kattintás: buborék adatainak szerkesztése modalon keresztül
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const bubble = getBubbleAt(x, y);
  if (bubble) {
    openBubbleModal(bubble);
  }
});

// --- Touch események ---
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const pos = getPointerPosition(e);
  const rect = canvas.getBoundingClientRect();
  const x = pos.clientX - rect.left;
  const y = pos.clientY - rect.top;
  
  let bubble = getBubbleAt(x, y);
  if (bubble) {
    if (connectMode) {
      if (!connectionStartBubble) {
        connectionStartBubble = bubble;
        canvas.style.cursor = 'crosshair';
      } else if (connectionStartBubble.id !== bubble.id) {
        connections.push({ from: connectionStartBubble.id, to: bubble.id });
        connectionStartBubble = null;
        saveData();
        render();
      }
    } else {
      isDragging = true;
      draggedBubble = bubble;
      const worldX = (x - offsetX) / scale;
      const worldY = (y - offsetY) / scale;
      dragOffset.x = worldX - bubble.x;
      dragOffset.y = worldY - bubble.y;
    }
  } else {
    isPanning = true;
    panStart.x = pos.clientX;
    panStart.y = pos.clientY;
    canvas.style.cursor = 'grabbing';
  }
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const pos = getPointerPosition(e);
  const rect = canvas.getBoundingClientRect();
  const x = pos.clientX - rect.left;
  const y = pos.clientY - rect.top;
  
  if (isDragging && draggedBubble) {
    const worldX = (x - offsetX) / scale;
    const worldY = (y - offsetY) / scale;
    draggedBubble.x = worldX - dragOffset.x;
    draggedBubble.y = worldY - dragOffset.y;
    render();
  } else if (isPanning) {
    const dx = pos.clientX - panStart.x;
    const dy = pos.clientY - panStart.y;
    offsetX += dx;
    offsetY += dy;
    panStart.x = pos.clientX;
    panStart.y = pos.clientY;
    render();
  }
});

canvas.addEventListener('touchend', (e) => {
  isDragging = false;
  draggedBubble = null;
  isPanning = false;
  canvas.style.cursor = 'grab';
});

/*************************/
/* Render függvény       */
/*************************/
function render() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  
  // Szűrés: focus mód vagy keresési feltétel esetén
  let visibleBubbles = bubbles;
  if (focusBubbleId) {
    const focusBub = bubbles.find(b => b.id === focusBubbleId);
    if (focusBub) {
      let connectedIds = new Set();
      connections.forEach(conn => {
        if (conn.from === focusBubbleId) connectedIds.add(conn.to);
        else if (conn.to === focusBubbleId) connectedIds.add(conn.from);
      });
      visibleBubbles = bubbles.filter(b => b.id === focusBubbleId || connectedIds.has(b.id));
    }
  } else if (searchQuery !== "") {
    visibleBubbles = bubbles.filter(b => 
      b.title.toLowerCase().includes(searchQuery) ||
      (b.tags && b.tags.toLowerCase().includes(searchQuery))
    );
  }
  
  // Kapcsolatok rajzolása (csak ha mindkét végpont látható)
  connections.forEach(conn => {
    const b1 = bubbles.find(b => b.id === conn.from);
    const b2 = bubbles.find(b => b.id === conn.to);
    if (b1 && b2 && visibleBubbles.includes(b1) && visibleBubbles.includes(b2)) {
      ctx.beginPath();
      ctx.moveTo(b1.x, b1.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
  
  // Buborékok kirajzolása
  visibleBubbles.forEach(bubble => {
    // Buborék kör
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, 40, 0, 2 * Math.PI);
    ctx.fillStyle = bubble.color;
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Ikon – középre helyezzük
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(bubble.icon, bubble.x, bubble.y - 10);
    
    // Cím a buborék alatt
    ctx.font = "14px Arial";
    ctx.fillStyle = "#000";
    ctx.fillText(bubble.title, bubble.x, bubble.y + 35);
  });
  
  ctx.restore();
}
render();

/*************************/
/* Kontroll gombok       */
/*************************/
// Új buborék létrehozása
document.getElementById('newBubble').addEventListener('click', () => {
  const worldX = (canvas.width / 2 - offsetX) / scale;
  const worldY = (canvas.height / 2 - offsetY) / scale;
  const id = Date.now(); // Egyszerű egyedi azonosító
  const newBubble = {
    id,
    x: worldX,
    y: worldY,
    title: "Új buborék",
    description: "",
    color: getRandomColor(),
    icon: "💡",
    tags: ""
  };
  bubbles.push(newBubble);
  saveData();
  render();
  openBubbleModal(newBubble);
});

// Csatlakozás mód váltása
document.getElementById('connectMode').addEventListener('click', () => {
  connectMode = !connectMode;
  connectionStartBubble = null;
  document.getElementById('connectMode').textContent = "Csatlakozás: " + (connectMode ? "Be" : "Ki");
});

// Térkép újrakezdése
document.getElementById('resetMap').addEventListener('click', () => {
  if (confirm("Biztosan törlöd az összes buborékot és kapcsolatot?")) {
    bubbles = [];
    connections = [];
    saveData();
    render();
  }
});

// Exportálás JSON fájlba
document.getElementById('exportData').addEventListener('click', () => {
  const dataStr = JSON.stringify({ bubbles, connections }, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "mindweaver_data.json";
  a.click();
  URL.revokeObjectURL(url);
});

// Importálás JSON fájlból
document.getElementById('importData').addEventListener('click', () => {
  document.getElementById('fileInput').click();
});
document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const importedData = JSON.parse(event.target.result);
        bubbles = importedData.bubbles || [];
        connections = importedData.connections || [];
        saveData();
        render();
      } catch (err) {
        alert("Hiba az importált adatok feldolgozása során.");
      }
    }
    reader.readAsText(file);
  }
});

// Kereső input kezelése
document.getElementById('search').addEventListener('input', function() {
  searchQuery = this.value.trim().toLowerCase();
  if (searchQuery === "") {
    focusBubbleId = null;
    document.getElementById('exitFocus').style.display = 'none';
  }
  render();
});

// Kilépés a focus módból
document.getElementById('exitFocus').addEventListener('click', () => {
  focusBubbleId = null;
  document.getElementById('exitFocus').style.display = 'none';
  render();
});

/*************************/
/* Buborék modal kezelése*/
/*************************/
const modal = document.getElementById('bubbleModal');
const spanClose = document.querySelector('.modal .close');
spanClose.addEventListener('click', () => {
  modal.style.display = "none";
});
window.addEventListener('click', (e) => {
  if (e.target == modal) {
    modal.style.display = "none";
  }
});

function openBubbleModal(bubble) {
  modal.style.display = "flex";
  document.getElementById('bubbleTitle').value = bubble.title;
  document.getElementById('bubbleDescription').value = bubble.description;
  document.getElementById('bubbleColor').value = bubble.color;
  document.getElementById('bubbleIcon').value = bubble.icon;
  document.getElementById('bubbleTags').value = bubble.tags;
  document.getElementById('bubbleId').value = bubble.id;
}

document.getElementById('bubbleForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = parseInt(document.getElementById('bubbleId').value);
  let bubble = bubbles.find(b => b.id === id);
  if (bubble) {
    bubble.title = document.getElementById('bubbleTitle').value;
    bubble.description = document.getElementById('bubbleDescription').value;
    bubble.color = document.getElementById('bubbleColor').value;
    bubble.icon = document.getElementById('bubbleIcon').value;
    bubble.tags = document.getElementById('bubbleTags').value;
    saveData();
    render();
  }
  modal.style.display = "none";
});
