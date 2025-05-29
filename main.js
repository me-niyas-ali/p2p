const socket = io("https://p2p-share-7wvh.onrender.com"); // Replace with your backend Render URL
const username = generateUsername();
let peers = {};
let selectedFiles = [];

function generateUsername() {
  const words = ["fast", "cool", "fun", "sharp", "pink", "light", "red", "sun"];
  return `${words[Math.floor(Math.random()*words.length)]}-${words[Math.floor(Math.random()*words.length)]}`;
}

function showToast(msg) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = msg;
  document.getElementById("toast").appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showModal(text, onAccept, onReject) {
  const modal = document.getElementById("modal");
  document.getElementById("modalText").innerText = text;
  modal.classList.remove("hidden");
  document.getElementById("acceptBtn").onclick = () => {
    modal.classList.add("hidden");
    onAccept();
  };
  document.getElementById("rejectBtn").onclick = () => {
    modal.classList.add("hidden");
    onReject();
  };
}

socket.emit("join", username);

socket.on("peer-list", list => {
  const container = document.getElementById("peerList");
  container.innerHTML = "";
  list.forEach(peer => {
    if (peer === username) return;
    const card = document.createElement("div");
    card.className = "peer-card";
    card.innerHTML = `<p>${peer}</p><button onclick="connect('${peer}')">Connect</button>`;
    container.appendChild(card);
  });
});

function connect(peerId) {
  const peer = new SimplePeer({ initiator: true, trickle: false });
  setupPeerEvents(peer, peerId);
  peers[peerId] = peer;

  peer.on("signal", data => {
    socket.emit("signal", { to: peerId, from: username, data });
  });
}

socket.on("signal", ({ from, data }) => {
  if (!peers[from]) {
    const peer = new SimplePeer({ initiator: false, trickle: false });
    setupPeerEvents(peer, from);
    peers[from] = peer;
  }
  peers[from].signal(data);
});

function setupPeerEvents(peer, id) {
  peer.on("connect", () => {
    showToast(`Connected to ${id}`);
    document.getElementById("sendBtn").disabled = false;
  });

  peer.on("data", async data => {
    const msg = JSON.parse(data);
    if (msg.type === "file-meta") {
      showModal(`Accept file "${msg.name}" (${(msg.size / 1024).toFixed(1)} KB)?`, () => {
        peer.send(JSON.stringify({ type: "accept" }));
      }, () => {
        peer.send(JSON.stringify({ type: "reject" }));
      });
    } else if (msg.type === "file-chunk") {
      if (!peer._buffer) peer._buffer = [];
      peer._buffer.push(msg.chunk);
      updateProgress(id, msg.percent);
    } else if (msg.type === "file-end") {
      const blob = new Blob(peer._buffer);
      const url = URL.createObjectURL(blob);
      renderDownloadCard(msg.name, url, id);
      peer._buffer = null;
    }
  });

  peer.on("close", () => {
    showToast(`${id} disconnected`);
    delete peers[id];
  });
}

document.getElementById("fileInput").addEventListener("change", e => {
  selectedFiles = [...e.target.files];
});

document.getElementById("sendBtn").addEventListener("click", () => {
  if (selectedFiles.length === 0) return alert("No files selected");

  for (const id in peers) {
    selectedFiles.forEach(file => {
      peers[id].send(JSON.stringify({
        type: "file-meta",
        name: file.name,
        size: file.size
      }));

      let offset = 0;
      const reader = new FileReader();
      const CHUNK_SIZE = 64 * 1024;

      reader.onload = e => {
        sendChunk();
      };

      function sendChunk() {
        const chunk = file.slice(offset, offset + CHUNK_SIZE);
        const percent = Math.min((offset / file.size) * 100, 100).toFixed(1);
        reader.onloadend = () => {
          peers[id].send(JSON.stringify({
            type: "file-chunk",
            chunk: reader.result,
            percent
          }));
          offset += CHUNK_SIZE;
          if (offset < file.size) sendChunk();
          else peers[id].send(JSON.stringify({ type: "file-end", name: file.name }));
        };
        reader.readAsArrayBuffer(chunk);
      }

      sendChunk();
    });
  }
});

function updateProgress(id, percent) {
  let bar = document.querySelector(`#progress-${id} .progress`);
  if (!bar) {
    const card = document.createElement("div");
    card.className = "progress-card";
    card.id = `progress-${id}`;
    card.innerHTML = `<p>Receiving from ${id}</p><div class="progress-bar"><div class="progress" style="width: 0%"></div></div>`;
    document.getElementById("fileTransfers").appendChild(card);
    bar = card.querySelector(".progress");
  }
  bar.style.width = percent + "%";
}

function renderDownloadCard(name, url, id) {
  const card = document.getElementById(`progress-${id}`);
  card.innerHTML += `<a href="${url}" download="${name}"><button>Download ${name}</button></a>`;
}
