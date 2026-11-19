// Team 3: memory confidence and accuracy experiment.
// DataPipe saves anonymous participant summaries and trial-level responses after all three rounds.
const DATAPIPE_EXPERIMENT_ID = "VDmArf6wLtj5";
const TEAM_ID = "3";
const CHAIN_ID = "A";
const QUALTRICS_URL = "https://stlawu.qualtrics.com/jfe/form/SV_dhuzwAkMKUaZetM";
const incomingParams = new URLSearchParams(window.location.search);
const sessionId = incomingParams.get("sid");
const incomingChain = incomingParams.get("chain");
const validSession = Boolean(sessionId && /^[A-Za-z0-9_-]{4,128}$/.test(sessionId) && incomingChain === CHAIN_ID);
let sessionStart = new Date().toISOString();

const scenes = [
  {
    name: "College Dorm Room",
    image: "images/dorm-room.png",
    questions: [
      { question: "What color was the backpack?", options: ["Blue", "Green", "Black", "Pink"], correct: 1 },
      { question: "Where was the notebook?", options: ["On the bed", "On the desk", "On the floor", "On the windowsill"], correct: 1 },
      { question: "What was pictured on the wall poster?", options: ["A city skyline", "A beach", "A mountain landscape", "A flower"], correct: 2 },
      { question: "What color were the sneakers?", options: ["White", "Blue", "Red", "Black"], correct: 2 },
      { question: "Which type of plant was on the windowsill?", options: ["A cactus", "A fern", "A sunflower", "A bonsai"], correct: 0 },
      { question: "Where was the clock?", options: ["Above the desk", "Beside the bed", "On the bookshelf", "Above the door"], correct: 0 }
    ]
  },
  {
    name: "Campus Café",
    image: "images/campus-cafe.png",
    questions: [
      { question: "What color was the coffee cup on the front table?", options: ["Blue", "Purple", "Yellow", "White"], correct: 1 },
      { question: "Where was the orange backpack?", options: ["On the counter", "Under the table", "Beside a chair", "By the door"], correct: 2 },
      { question: "What kind of pastry was in the display case?", options: ["A muffin", "A donut", "A croissant", "A cookie"], correct: 2 },
      { question: "What was pictured in the wall art?", options: ["A bicycle", "A mountain", "A flower", "A dog"], correct: 0 },
      { question: "What color was the book beside the laptop?", options: ["Green", "Blue", "Yellow", "Red"], correct: 3 },
      { question: "Where was the tall plant?", options: ["Behind the counter", "By the window", "Beside the menu", "Near the entrance"], correct: 1 }
    ]
  }
  ,{
    name: "Campus Library",
    image: "images/Library.png",
    questions: [
      { question: "What color was the backpack on the chair?", options: ["Blue", "Green", "Pink", "Black"], correct: 1 },
      { question: "What color was the water bottle on the table?", options: ["Red", "Yellow", "Teal", "Purple"], correct: 2 },
      { question: "What was beside the notebook on the table?", options: ["A pen", "A pair of glasses", "A coffee cup", "A ruler"], correct: 0 },
      { question: "What was on the shelf to the right?", options: ["A clock", "A globe", "A vase", "A trophy"], correct: 1 },
      { question: "What color was the phone case on the table?", options: ["Black", "Blue", "Pink", "Green"], correct: 2 },
      { question: "How many blue armchairs were by the window?", options: ["One", "Two", "Three", "Four"], correct: 1 }
    ]
  }
];

function shuffleScenes(indices) {
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

const participant = {
  id: sessionId,
  order: shuffleScenes([0, 1, 2]),
  responses: []
};

let round = 0;
let questionIndex = 0;
let selectedAnswer = null;
let timerInterval = null;
let studyStart = null;
let questionStart = null;
const $ = id => document.getElementById(id);

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(screen => screen.classList.add("hidden"));
  $(id).classList.remove("hidden");
  window.scrollTo(0, 0);
}

function currentScene() {
  return scenes[participant.order[round]];
}

function startStudy() {
  clearInterval(timerInterval);
  showScreen("study");
  const scene = currentScene();
  $("sceneContainer").innerHTML = "";
  const image = document.createElement("img");
  image.alt = scene.name;
  image.onerror = () => {
    if (scene.image === "images/campus-cafe.png" && !image.dataset.triedFallback) {
      image.dataset.triedFallback = "true";
      image.src = "images/campus-cafe.png.png";
      return;
    }
    clearInterval(timerInterval);
    $("sceneContainer").textContent = "Image could not load. Please refresh the page.";
  };
  image.onload = () => {
    let seconds = 20;
    $("timer").textContent = seconds;
    studyStart = performance.now();
    timerInterval = setInterval(() => {
      seconds--;
      $("timer").textContent = seconds;
      if (seconds <= 0) {
        clearInterval(timerInterval);
        questionIndex = 0;
        showQuestion();
      }
    }, 1000);
  };
  $("sceneContainer").appendChild(image);
  image.src = scene.image;
}

function showQuestion() {
  showScreen("questions");
  selectedAnswer = null;
  const question = currentScene().questions[questionIndex];
  $("progress").textContent = `Round ${round + 1} of ${participant.order.length} · Question ${questionIndex + 1} of ${currentScene().questions.length}`;
  $("questionText").textContent = question.question;
  $("answerOptions").innerHTML = "";
  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "answer-option";
    button.textContent = option;
    button.addEventListener("click", () => {
      selectedAnswer = index;
      document.querySelectorAll(".answer-option").forEach(b => b.classList.remove("selected"));
      button.classList.add("selected");
      $("nextBtn").disabled = false;
    });
    $("answerOptions").appendChild(button);
  });
  $("confidence").value = 75;
  $("confidenceValue").textContent = "75";
  $("nextBtn").disabled = true;
  questionStart = performance.now();
}

function saveAnswer() {
  if (selectedAnswer === null) return;
  const question = currentScene().questions[questionIndex];
  participant.responses.push({
    participant_id: participant.id,
    session_id: sessionId,
    team_id: TEAM_ID,
    chain_id: CHAIN_ID,
    round: round + 1,
    scene: currentScene().name,
    question_number: questionIndex + 1,
    question: question.question,
    selected_answer: question.options[selectedAnswer],
    correct_answer: question.options[question.correct],
    correct: selectedAnswer === question.correct ? 1 : 0,
    confidence: Number($("confidence").value),
    response_time_ms: Math.round(performance.now() - questionStart)
  });
  questionIndex++;
  if (questionIndex < currentScene().questions.length) showQuestion();
  else if (round === 0) showFeedback();
  else if (round < participant.order.length - 1) {
    round++;
    startStudy();
  } else showResults();
}

function getRoundResponses(number) {
  return participant.responses.filter(r => r.round === number);
}

function calculateMetrics(responses) {
  const n = responses.length;
  const accuracy = responses.reduce((sum, r) => sum + r.correct, 0) / n;
  const confidence = responses.reduce((sum, r) => sum + r.confidence, 0) / n / 100;
  const brier = responses.reduce((sum, r) => {
    const difference = r.confidence / 100 - r.correct;
    return sum + difference * difference;
  }, 0) / n;
  return {
    accuracy: Math.round(accuracy * 100),
    confidence: Math.round(confidence * 100),
    brier: brier.toFixed(3)
  };
}

function showFeedback() {
  showScreen("feedback");
  const responses = getRoundResponses(1);
  const metrics = calculateMetrics(responses);
  const review = responses.map(r => `<li>
    ${r.question}<br>
    Your answer: ${r.selected_answer}<br>
    Correct answer: ${r.correct_answer}<br>
    Confidence: ${r.confidence}%
  </li>`).join("");
  $("feedbackContent").innerHTML = `
    <p>You answered <strong>${metrics.accuracy}%</strong> correctly.</p>
    <p>Your average confidence was <strong>${metrics.confidence}%</strong>.</p>
    <p>Confidence is how certain you feel. Accuracy is whether your memory was correct.</p>
    <p>Sometimes we feel very confident about details that we remember incorrectly.
    This is one reason metacognition—evaluating our own thinking—is important.</p>
    <h3>Review your answers</h3>
    <ol style="text-align:left">${review}</ol>
    <p>In the next round, try to distinguish between details you clearly remember
    and details you might be guessing. You will study two more scenes.</p>
  `;
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
function toCSV(headers, rows) {
  return [headers.join(","), ...rows.map(row => headers.map(h => csvEscape(row[h])).join(","))].join("\n");
}
function resultsCSV() {
  const headers = ["session_id", "team_id", "chain_id", "participant_id", "round", "scene", "question_number", "question", "selected_answer", "correct_answer", "correct", "confidence", "response_time_ms"];
  return toCSV(headers, participant.responses);
}
function summaryCSV() {
  const before = calculateMetrics(getRoundResponses(1));
  const after = calculateMetrics(participant.responses.filter(r => r.round > 1));
  const row = {
    session_id: sessionId, team_id: TEAM_ID, chain_id: CHAIN_ID,
    session_start: sessionStart, session_end: new Date().toISOString(),
    trial_count: participant.responses.length,
    scene_order: participant.order.map(i => scenes[i].name).join(" | "),
    before_accuracy: before.accuracy, before_confidence: before.confidence, before_brier: before.brier,
    after_accuracy: after.accuracy, after_confidence: after.confidence, after_brier: after.brier,
    brier_change: (Number(after.brier) - Number(before.brier)).toFixed(3)
  };
  return toCSV(Object.keys(row), [row]);
}
async function sendCsvToDataPipe(filename, csvText) {
  const response = await fetch("https://pipe.jspsych.org/api/data/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ experimentID: DATAPIPE_EXPERIMENT_ID, filename, data: csvText })
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 201 || response.status === 202) return;
  if (response.status === 400 && body.error === "FILE_EXISTS") return;
  throw new Error(body.error || `DataPipe HTTP ${response.status}`);
}
async function uploadToDataPipe() {
  // Retry both: FILE_EXISTS is accepted for a file already stored.
  await Promise.all([
    sendCsvToDataPipe(`summary_${sessionId}.csv`, summaryCSV()),
    sendCsvToDataPipe(`trials_${sessionId}.csv`, resultsCSV())
  ]);
}
function goToQualtrics() {
  const url = new URL(QUALTRICS_URL);
  url.searchParams.set("sid", sessionId);
  url.searchParams.set("chain", CHAIN_ID);
  url.searchParams.set("source_team", TEAM_ID);
  window.location.assign(url.toString());
}

function educationalInterpretation(before, after) {
  const beforeBrier = Number(before.brier);
  const afterBrier = Number(after.brier);
  const improvement = beforeBrier - afterBrier;
  const gap = after.confidence - after.accuracy;

  let calibration;
  if (improvement > 0.015) {
    calibration = `Your calibration error decreased by ${improvement.toFixed(3)}. Your confidence matched your answers more closely in the later rounds. Feedback may have helped you monitor when you knew an answer versus when you were guessing.`;
  } else if (improvement < -0.015) {
    calibration = `Your calibration error increased by ${Math.abs(improvement).toFixed(3)}. Your confidence matched your answers less closely in the later rounds. This does not mean you failed to learn: the scenes differed, and attention, guessing, or practice may have affected your scores.`;
  } else {
    calibration = `Your calibration error changed very little (${Math.abs(improvement).toFixed(3)}). Your confidence-to-accuracy match was fairly similar across rounds. Feedback does not always produce an immediate change, especially with only a few questions.`;
  }

  let confidence;
  if (gap >= 10) {
    confidence = `In the later rounds, your average confidence (${after.confidence}%) was ${gap} percentage points higher than your accuracy (${after.accuracy}%). This suggests overconfidence: you felt more certain than your performance supported.`;
  } else if (gap <= -10) {
    confidence = `In the later rounds, your average confidence (${after.confidence}%) was ${Math.abs(gap)} percentage points lower than your accuracy (${after.accuracy}%). This suggests underconfidence: you remembered more correctly than you expected.`;
  } else {
    confidence = `In the later rounds, your average confidence (${after.confidence}%) was close to your accuracy (${after.accuracy}%). This suggests relatively good overall confidence calibration, although individual answers may still have been over- or underconfident.`;
  }

  let performance;
  if (after.accuracy > before.accuracy) {
    performance = `Your accuracy increased from ${before.accuracy}% to ${after.accuracy}%. You may have used the first-round feedback to pay closer attention to details, but later scenes or practice could also explain the change.`;
  } else if (after.accuracy < before.accuracy) {
    performance = `Your accuracy decreased from ${before.accuracy}% to ${after.accuracy}%. The later scenes may have been harder for you, or some details may not have been encoded as strongly during the 20-second study period.`;
  } else {
    performance = `Your accuracy stayed at ${after.accuracy}%. Even without an accuracy change, your confidence judgments and calibration may have changed.`;
  }

  return `
    <section aria-label="Understanding your memory results" style="margin-top:24px;text-align:left;line-height:1.6">
      <h3>What Cognitive Psychology Predicts</h3>
      <p><strong>Memory is reconstructive:</strong> remembering a scene is not like replaying a photograph. Attention and encoding affect which details you retain, so some answers may be incorrect even when they feel familiar.</p>
      <p><strong>Metacognition</strong> is judging your own knowledge. <strong>Confidence calibration</strong> measures how well certainty matches correctness. A lower Brier score (closer to 0) means better calibration. We might expect feedback to help people notice overconfidence or underconfidence and improve later judgments, but improvement is not guaranteed.</p>
      <h3>What Your Scores Suggest</h3>
      <p>${calibration}</p>
      <p>${confidence}</p>
      <p>${performance}</p>
      <h3>Why Your Results May Differ from Expectations</h3>
      <p>Your attention during the 20-second viewing period, which objects stood out, how difficult each scene was, guessing, and fatigue or practice can all affect accuracy and confidence. Because the three rounds use different scenes and there is no no-feedback comparison group, your scores alone cannot show that feedback caused any change.</p>
      <p><strong>Takeaway:</strong> Feeling certain is not the same as being correct. Checking both your accuracy and your confidence can help you recognize when your memory judgments are well calibrated.</p>
    </section>`;
}

function showResults() {
  showScreen("results");
  const before = calculateMetrics(getRoundResponses(1));
  const after = calculateMetrics(participant.responses.filter(r => r.round > 1));
  const change = (Number(after.brier) - Number(before.brier)).toFixed(3);
  $("resultsContent").innerHTML = `
    <h3>Before Feedback</h3>
    <p>Accuracy: ${before.accuracy}%</p>
    <p>Average confidence: ${before.confidence}%</p>
    <p>Calibration error: ${before.brier}</p>
    <h3>After Feedback (Rounds 2 and 3)</h3>
    <p>Accuracy: ${after.accuracy}%</p>
    <p>Average confidence: ${after.confidence}%</p>
    <p>Calibration error: ${after.brier}</p>
    <p class="small">Round 2: ${calculateMetrics(getRoundResponses(2)).accuracy}% accurate · Round 3: ${calculateMetrics(getRoundResponses(3)).accuracy}% accurate</p>
    <h3>Your Change in Calibration Error</h3>
    <p>${change}</p>
    <p>Lower calibration error means your confidence better matched
    whether your answers were correct.</p>
    <p>This comparison alone cannot prove feedback caused the change. Scene difficulty and practice may also matter.</p>
    ${educationalInterpretation(before, after)}
    <button id="downloadBtn">Download Question Results (CSV)</button>
    <button id="downloadSummaryBtn">Download Summary (CSV)</button>
  `;
  $("downloadBtn").addEventListener("click", downloadResults);
  $("downloadSummaryBtn").addEventListener("click", downloadSummary);

  const saveStatus = document.createElement("p");
  saveStatus.setAttribute("role", "status");
  saveStatus.textContent = "Saving your results to DataPipe...";
  $("resultsContent").appendChild(saveStatus);

  const continueBtn = document.createElement("button");
  continueBtn.textContent = "Continue to Research Credit Survey →";
  continueBtn.disabled = true;
  continueBtn.hidden = true;
  $("resultsContent").appendChild(continueBtn);
  continueBtn.addEventListener("click", goToQualtrics);

  const retryBtn = document.createElement("button");
  retryBtn.textContent = "Retry Saving Results";
  retryBtn.hidden = true;
  $("resultsContent").appendChild(retryBtn);

  async function saveAndEnableContinue() {
    saveStatus.textContent = "Saving your results to DataPipe...";
    retryBtn.hidden = true;
    continueBtn.hidden = true;
    continueBtn.disabled = true;
    try {
      await uploadToDataPipe();
      saveStatus.textContent = "Your results were accepted by DataPipe. Review them, then continue to the survey for research credit.";
      continueBtn.hidden = false;
      continueBtn.disabled = false;
    } catch (error) {
      console.error("DataPipe upload failed:", error);
      saveStatus.textContent = "Saving failed. Please retry before continuing. You may also download a local copy below.";
      retryBtn.hidden = false;
    }
  }
  retryBtn.addEventListener("click", saveAndEnableContinue);
  saveAndEnableContinue();
}

function downloadSummary() {
  const blob = new Blob([summaryCSV()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `summary_${sessionId}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadResults() {
  const blob = new Blob([resultsCSV()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `trials_${sessionId}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

$("startBtn").addEventListener("click", startStudy);
$("nextBtn").addEventListener("click", saveAnswer);
$("roundTwoBtn").addEventListener("click", () => {
  round = 1;
  startStudy();
});
$("confidence").addEventListener("input", event => {
  $("confidenceValue").textContent = event.target.value;
});

// A manual session-ID field is available ONLY on the explicit testing URL (?test=1).
// Real participants must arrive from Team 2 with sid and chain=A in their URL.
function showTestSessionEntry() {
  const panel = document.createElement("form");
  panel.style.cssText = "margin:18px auto;padding:18px;max-width:460px;border:1px solid #a6c8e6;border-radius:12px;background:#eef7ff;text-align:left";
  const title = document.createElement("h3");
  title.textContent = "Test Session ID";
  const description = document.createElement("p");
  description.textContent = "For testing only. Enter a new anonymous test ID (at least 4 letters/numbers). Real participants must begin with Team 1 and continue through Team 2.";
  const label = document.createElement("label");
  label.textContent = "Session ID";
  label.htmlFor = "testSessionId";
  const field = document.createElement("input");
  field.id = "testSessionId";
  field.type = "text";
  field.placeholder = "e.g. TEST9015";
  field.required = true;
  field.pattern = "[A-Za-z0-9_-]{4,128}";
  field.maxLength = 128;
  field.style.cssText = "display:block;width:100%;box-sizing:border-box;margin:8px 0 12px;padding:10px;border:1px solid #86acd0;border-radius:6px";
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Start Test Session";
  const error = document.createElement("p");
  error.setAttribute("role", "alert");
  panel.append(title, description, label, field, submit, error);
  panel.addEventListener("submit", event => {
    event.preventDefault();
    const id = field.value.trim();
    if (!/^[A-Za-z0-9_-]{4,128}$/.test(id)) {
      error.textContent = "Use 4–128 letters, numbers, underscores, or hyphens.";
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("test");
    url.searchParams.set("sid", id);
    url.searchParams.set("chain", CHAIN_ID);
    window.location.assign(url.toString());
  });
  $("startBtn").insertAdjacentElement("beforebegin", panel);
}

// Team 3 is the last project in Chain A. Never create a replacement sid.
if (!validSession) {
  $("startBtn").disabled = true;
  const notice = document.createElement("p");
  notice.setAttribute("role", "alert");
  notice.textContent = "This activity must be opened after completing Team 2's memory game. Please begin through the preceding activity so your research-credit session is preserved.";
  $("startBtn").insertAdjacentElement("beforebegin", notice);
  if (incomingParams.get("test") === "1") showTestSessionEntry();
}
