const video = document.getElementById("camera");
const reading = document.getElementById("reading");
const distanceText = document.getElementById("distance");
const levelCircle = document.getElementById("levelCircle");
const toast = document.getElementById("toast");
const tableBody = document.querySelector("#dataTable tbody");

let ctx, canvas, lastLog = 0;

async function startSensors() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: "environment" },
    });

    // Show camera
    video.srcObject = stream;

    // Hidden canvas to analyze frames
    canvas = document.createElement("canvas");
    ctx = canvas.getContext("2d");

    // Audio setup
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);

    function process() {
      analyser.getByteFrequencyData(dataArray);
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) sumSquares += dataArray[i] * dataArray[i];
      const rms = Math.sqrt(sumSquares / dataArray.length);
      let db = Math.min(100, Math.max(0, (rms / 255) * 100));

      const distance = estimateDistance(video);
      if (distance > 1.5 && db < 66) db += distance * 10; // adjust db if far
      updateUI(db, distance);
      requestAnimationFrame(process);
    }

    process();
  } catch (err) {
    alert("⚠️ Please allow camera and microphone access for this to work!");
    console.error(err);
  }
}

// Estimate distance based on frame brightness (simple simulation)
function estimateDistance(videoEl) {
  if (!ctx || !canvas) return 0;
  const width = videoEl.videoWidth;
  const height = videoEl.videoHeight;
  if (!width || !height) return 0;

  canvas.width = width / 10;
  canvas.height = height / 10;
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let brightness = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    brightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
  }
  brightness /= pixels.length / 4;

  // Convert brightness to distance (mock formula)
  let distance = 3 - (brightness / 255) * 3;
  distance = Math.max(0.2, Math.min(3.0, distance));
  return parseFloat(distance.toFixed(2));
}

function updateUI(db, distance) {
  const now = new Date();
  const timeString = now.toLocaleTimeString();

  reading.textContent = db.toFixed(1) + " dB";
  distanceText.textContent = distance + " m";

  const offset = 283 - (db / 100) * 283;
  levelCircle.style.strokeDashoffset = offset;

  // Show alert if ≥ 66 dB
  if (db >= 66) showToast();

  // Log data every second
  if (now - lastLog >= 1000) {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${timeString}</td><td>${db.toFixed(1)}</td><td>${distance}</td>`;
    tableBody.prepend(row);
    lastLog = now;
  }
}

function showToast() {
  toast.style.display = "block";
  setTimeout(() => (toast.style.display = "none"), 2000);
}

window.addEventListener("load", () => startSensors());
