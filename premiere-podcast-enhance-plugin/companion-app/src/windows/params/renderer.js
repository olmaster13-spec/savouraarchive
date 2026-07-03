/* global document, podcastEnhance */

const views = {
  form: document.getElementById("formView"),
  progress: document.getElementById("progressView"),
  done: document.getElementById("doneView"),
  failed: document.getElementById("failedView"),
};

function showView(name) {
  for (const [key, el] of Object.entries(views)) el.classList.toggle("hidden", key !== name);
}

let currentJobId = null;
let currentClipName = "";
let presets = {};

const sliders = {
  strength: document.getElementById("strength"),
  speech: document.getElementById("speech"),
  noise: document.getElementById("noise"),
  music: document.getElementById("music"),
};
const outputs = {
  strength: document.getElementById("strengthOut"),
  speech: document.getElementById("speechOut"),
  noise: document.getElementById("noiseOut"),
  music: document.getElementById("musicOut"),
};

for (const key of Object.keys(sliders)) {
  sliders[key].addEventListener("input", () => {
    outputs[key].textContent = sliders[key].value;
  });
}

function setParams(params) {
  for (const key of Object.keys(sliders)) {
    sliders[key].value = params[key] ?? 0;
    outputs[key].textContent = sliders[key].value;
  }
}

function getParams() {
  const out = {};
  for (const key of Object.keys(sliders)) out[key] = Number(sliders[key].value);
  return out;
}

const presetSelect = document.getElementById("presetSelect");
presetSelect.addEventListener("change", () => {
  const name = presetSelect.value;
  if (name && presets[name]) setParams(presets[name]);
});

podcastEnhance.onInit((data) => {
  currentJobId = data.jobId;
  currentClipName = data.clipName;
  presets = data.presets || {};

  document.getElementById("clipName").textContent = data.clipName;
  document.getElementById("progressClipName").textContent = data.clipName;
  document.getElementById("replaceInPlace").checked = !!data.replaceInPlaceDefault;
  setParams(data.defaults || { strength: 50, speech: 100, noise: 0, music: 0 });

  presetSelect.innerHTML = '<option value="">Last used</option>';
  for (const name of Object.keys(presets)) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    presetSelect.appendChild(opt);
  }

  document.getElementById("progressLog").innerHTML = "";
  showView("form");
});

document.getElementById("confirmBtn").addEventListener("click", () => {
  const presetName = document.getElementById("presetName").value.trim();
  podcastEnhance.confirm({
    jobId: currentJobId,
    params: getParams(),
    replaceInPlace: document.getElementById("replaceInPlace").checked,
    presetName: presetName || null,
  });
  showView("progress");
  document.getElementById("progressMessage").textContent = "Sending to Adobe Podcast…";
});

document.getElementById("cancelBtn").addEventListener("click", () => {
  podcastEnhance.cancel();
});

podcastEnhance.onProgress(({ message }) => {
  document.getElementById("progressMessage").textContent = message;
  const li = document.createElement("li");
  li.textContent = message;
  document.getElementById("progressLog").prepend(li);
});

podcastEnhance.onDone(() => {
  document.getElementById("doneMessage").textContent = `"${currentClipName}" enhanced and imported.`;
  showView("done");
});

document.getElementById("dismissBtn").addEventListener("click", () => podcastEnhance.dismiss());

podcastEnhance.onFailed(({ stage, error }) => {
  document.getElementById("failedStage").textContent = `Failed at step: ${stage}`;
  document.getElementById("failedMessage").textContent = error;
  showView("failed");
});

document.getElementById("dismissFailedBtn").addEventListener("click", () => podcastEnhance.dismiss());
document.getElementById("retryBtn").addEventListener("click", () => {
  podcastEnhance.retry(currentJobId);
  showView("progress");
  document.getElementById("progressMessage").textContent = "Retrying…";
});
