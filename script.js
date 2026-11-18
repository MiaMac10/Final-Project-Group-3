
const DATAPIPE_EXPERIMENT_ID = "VDmArf6wLtj5";


async function uploadToDataPipe() {
  const headers = [
    "participant_id", "round", "scene",
    "question_number", "question",
    "selected_answer", "correct_answer",
    "correct", "confidence", "response_time_ms"
  ];

  const escapeCSV = value =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    headers.join(","),
    ...participant.responses.map(response =>
      headers.map(header => escapeCSV(response[header])).join(",")
    )
  ].join("\n");

  try {
    const response = await fetch(
      "https://pipe.jspsych.org/api/data/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          experimentID: DATAPIPE_EXPERIMENT_ID,
          filename: `final_memory_${participant.id}.csv`,
          data: csv
        })
      }
    );

    if (!response.ok) {
      throw new Error("DataPipe upload failed");
    }

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}


const scenes = [
  {
    name: "College Dorm Room",
    image: "images/dorm-room.png",
    questions: [
      {
        question: "What color was the backpack?",
        options: ["Blue", "Green", "Black", "Pink"],
        correct: 1
      },
      {
        question: "Where was the notebook?",
        options: ["On the bed", "On the desk", "On the floor", "On the windowsill"],
        correct: 1
      },
      {
        question: "What was pictured on the wall poster?",
        options: ["A city skyline", "A beach", "A mountain landscape", "A flower"],
        correct: 2
      },
      {
        question: "What color were the sneakers?",
        options: ["White", "Blue", "Red", "Black"],
        correct: 2
      },
      {
        question: "Which type of plant was on the windowsill?",
        options: ["A cactus", "A fern", "A sunflower", "A bonsai"],
        correct: 0
      },
      {
        question: "Where was the clock?",
        options: ["Above the desk", "Beside the bed", "On the bookshelf", "Above the door"],
        correct: 0
      }
    ]
  },
  {
    name: "Campus Café",
    image: "images/campus-cafe.png",
    questions: [
      {
        question: "What color was the coffee cup on the front table?",
        options: ["Blue", "Purple", "Yellow", "White"],
        correct: 1
      },
      {
        question: "Where was the orange backpack?",
        options: ["On the counter", "Under the table", "Beside a chair", "By the door"],
        correct: 2
      },
      {
        question: "What kind of pastry was in the display case?",
        options: ["A muffin", "A donut", "A croissant", "A cookie"],
        correct: 2
      },
      {
        question: "What was pictured in the wall art?",
        options: ["A bicycle", "A mountain", "A flower", "A dog"],
        correct: 0
      },
      {
        question: "What color was the book beside the laptop?",
        options: ["Green", "Blue", "Yellow", "Red"],
        correct: 3
      },
      {
        question: "Where was the tall plant?",
        options: ["Behind the counter", "By the window", "Beside the menu", "Near the entrance"],
        correct: 1
      }
    ]
  }
];

const participant = {
  id: crypto.randomUUID(),
  order: Math.random() < 0.5 ? [0, 1] : [1, 0],
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
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.add("hidden");
  });
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
  image.src = scene.image;
  image.alt = scene.name;
  
image.onerror = () => {
  if (
    scene.image === "images/campus-cafe.png" &&
    !image.dataset.triedFallback
  ) {
    image.dataset.triedFallback = "true";
    image.src = "images/campus-cafe.png.png";
    return;
  }

  clearInterval(timerInterval);
  $("sceneContainer").textContent =
    "Image could not load. Please refresh the page.";
};

  $("sceneContainer").appendChild(image);

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
}

function showQuestion() {
  showScreen("questions");
  selectedAnswer = null;

  const question = currentScene().questions[questionIndex];

  $("progress").textContent =
    `Round ${round + 1} of 2 · Question ${questionIndex + 1} of 6`;

  $("questionText").textContent = question.question;
  $("answerOptions").innerHTML = "";

  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "answer-option";
    button.textContent = option;

    button.addEventListener("click", () => {
      selectedAnswer = index;

      document.querySelectorAll(".answer-option").forEach(b => {
        b.classList.remove("selected");
      });

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

  if (questionIndex < 6) {
    showQuestion();
  } else if (round === 0) {
    showFeedback();
  } else {
    showResults();
  }
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

  const review = responses.map(r => {
    return `<li>
      ${r.question}<br>
      Your answer: ${r.selected_answer}<br>
      Correct answer: ${r.correct_answer}<br>
      Confidence: ${r.confidence}%
    </li>`;
  }).join("");

  $("feedbackContent").innerHTML = `
    <p>You answered <strong>${metrics.accuracy}%</strong> correctly.</p>
    <p>Your average confidence was <strong>${metrics.confidence}%</strong>.</p>
    <p>Confidence is how certain you feel. Accuracy is whether your memory was correct.</p>
    <p>Sometimes we feel very confident about details that we remember incorrectly.
    This is one reason metacognition—evaluating our own thinking—is important.</p>
    <h3>Review your answers</h3>
    <ol style="text-align:left">${review}</ol>
    <p>In the next round, try to distinguish between details you clearly remember
    and details you might be guessing.</p>
  `;
}

function showResults() {
  showScreen("results");

  const before = calculateMetrics(getRoundResponses(1));
  const after = calculateMetrics(getRoundResponses(2));

  const change = (Number(after.brier) - Number(before.brier)).toFixed(3);

  $("resultsContent").innerHTML = `
    <h3>Before Feedback</h3>
    <p>Accuracy: ${before.accuracy}%</p>
    <p>Average confidence: ${before.confidence}%</p>
    <p>Calibration error: ${before.brier}</p>

    <h3>After Feedback</h3>
    <p>Accuracy: ${after.accuracy}%</p>
    <p>Average confidence: ${after.confidence}%</p>
    <p>Calibration error: ${after.brier}</p>

    <h3>Your Change in Calibration Error</h3>
    <p>${change}</p>
    <p>Lower calibration error means your confidence better matched
    whether your answers were correct.</p>
    <p>This comparison alone cannot prove feedback caused the change.</p>
    <button id="downloadBtn">Download My Results</button>
  `;

  $("downloadBtn").addEventListener("click", downloadResults);


  const saveStatus = document.createElement("p");
  saveStatus.textContent = "Saving your results...";
  $("resultsContent").appendChild(saveStatus);

  uploadToDataPipe().then(success => {
    saveStatus.textContent = success
      ? "Your results have been submitted."
      : "Automatic saving failed. Please download your results.";
  });
}

function downloadResults() {
  const headers = [
    "participant_id", "round", "scene", "question_number",
    "question", "selected_answer", "correct_answer",
    "correct", "confidence", "response_time_ms"
  ];

  const escapeCSV = value =>
    `"${String(value).replace(/"/g, '""')}"`;

  const rows = [
    headers.join(","),
    ...participant.responses.map(r =>
      headers.map(h => escapeCSV(r[h])).join(",")
    )
  ];

  const blob = new Blob([rows.join("\n")], {
    type: "text/csv;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `memory_results_${participant.id}.csv`;
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
