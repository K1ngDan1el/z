/* src/scripts/quiz1.js (VERSIÓN 7 MINUTOS + TIMER PISTA POR PREGUNTA) */

// --- CONFIGURACIÓN ---
const TOTAL_TIME_SECONDS = 420; // 7 minutos
const HINT_COOLDOWN_SECONDS = 30; // Cada pista tarda 60s en abrirse
const TIME_BONUS = 10; // Recompensa por respuesta correcta
// -----------------------------

// === SONIDOS ===
const soundCorrect = new Audio('/Sounds/sonido-correcto.mp3');
const soundIncorrect = new Audio('/Sounds/sonido-incorrecto.mp3');
const soundTimeUp = new Audio('/Sounds/tiempo-fuera.mp3');
const soundWarning = new Audio('/Sounds/advertencia.mp3');
const musicBackground = new Audio('/Sounds/musica-fondo.mp3');
musicBackground.loop = false;
musicBackground.volume = 0.5;
let isMusicStarted = false;

// --- Variables Globales ---
let quizData = [];
let score = 0;
let totalQuestions = 0;
let currentQuestionIndex = 0;
let timerInterval = null;

// Timers
let gameTimeLeft = TOTAL_TIME_SECONDS;     
let hintTimeLeft = HINT_COOLDOWN_SECONDS;  

// --- Elementos del DOM ---
let resultDiv, resetBtn, nextBtn, quizContainer, quizForm;
let timerBar, timerBarDelay, timerText;
let allOptions, allQuestions, allHintButtons;

// --- LÓGICA DE LOS TIMERS ---
function startTimer() {
  // 1. Reiniciar variables
  gameTimeLeft = TOTAL_TIME_SECONDS;
  hintTimeLeft = HINT_COOLDOWN_SECONDS; 
  
  isMusicStarted = false; 
  currentQuestionIndex = 0;
  
  if (timerInterval) clearInterval(timerInterval);
  
  updateTimerDisplay(); 
  checkTimeEffects();
  showQuestion(currentQuestionIndex);

  // Reset visual de barras
  if (timerBar) timerBar.style.transition = 'none';
  if (timerBarDelay) timerBarDelay.style.transition = 'none';
  updateTimerDisplay();
  void timerBar.offsetWidth; // Forzar reflow
  
  if (timerBar) timerBar.style.transition = 'background-color 0.5s ease';
  if (timerBarDelay) timerBarDelay.style.transition = 'width 0.5s linear';

  // 2. Bucle Principal (cada 1 segundo)
  timerInterval = setInterval(() => {
    // A) Timer del Juego
    gameTimeLeft--;
    updateTimerDisplay();
    checkTimeEffects();

    // Música de tensión (cuando queda poco tiempo)
    if (gameTimeLeft === 85 && !isMusicStarted) {
        musicBackground.play().catch(e => console.error("Error audio:", e));
        isMusicStarted = true;
    }
    
    // B) Timer de Pista (SOLO PARA LA PREGUNTA ACTUAL)
    // Si el tiempo de la pista es mayor a 0, restamos.
    if (hintTimeLeft > 0) {
      hintTimeLeft--;
      // Si llega a 0 justo ahora, desbloqueamos la actual
      if (hintTimeLeft === 0) {
        unlockCurrentHint();
      }
    }

    // C) Fin del Juego por tiempo
    if (gameTimeLeft <= 0) {
      showFinalResult(true);
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function updateTimerDisplay() {
  if (!timerBar || !timerText || !timerBarDelay) return; 
  
  // Cálculo de porcentaje
  const percentage = Math.min((gameTimeLeft / TOTAL_TIME_SECONDS) * 100, 100);
  
  timerBar.style.width = percentage + '%'; 
  timerBarDelay.style.width = percentage + '%'; 

  const minutes = Math.floor(gameTimeLeft / 60);
  const seconds = gameTimeLeft % 60;
  timerText.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function checkTimeEffects() {
  if (!quizContainer) return;
  
  if (gameTimeLeft <= 20) {
    quizContainer.classList.remove('timer-warning');
    quizContainer.classList.add('timer-danger');
    if (timerBar) timerBar.style.background = 'linear-gradient(90deg, #dc3545, #f85768)';
    if (gameTimeLeft === 20) soundWarning.play();
  } else if (gameTimeLeft <= 60) {
    quizContainer.classList.remove('timer-danger');
    quizContainer.classList.add('timer-warning');
    if (timerBar) timerBar.style.background = 'linear-gradient(90deg, #ffc107, #ffeb3b)';
  } else {
    quizContainer.classList.remove('timer-warning', 'timer-danger');
    if (timerBar) timerBar.style.background = 'linear-gradient(90deg, #28a745, #5cdd7c)';
  }
}

// --- FUNCIONES VISUALES PARA PISTAS ---

/**
 * Desbloquea SOLAMENTE la pista de la pregunta actual
 */
function unlockCurrentHint() {
  if (!allHintButtons) return;
  // Obtenemos el botón correspondiente a la pregunta actual
  const currentBtn = allHintButtons[currentQuestionIndex];
  
  // Verificamos que exista y que no esté ya desbloqueado o usado
  if (currentBtn && currentBtn.disabled && !currentBtn.classList.contains('used')) {
      currentBtn.disabled = false;
      currentBtn.classList.add('unlocked');
      currentBtn.textContent = '💡 PISTA'; // Texto visible al desbloquearse
      currentBtn.style.opacity = '1';
      
      // Opcional: Pequeño efecto visual para avisar que ya está disponible
      currentBtn.style.transform = "scale(1.1)";
      setTimeout(() => currentBtn.style.transform = "scale(1)", 200);
  }
}

// --- FUNCIONES DEL QUIZ ---

function buildQuizHTML() {
  let html = '';
  quizData.forEach((question, index) => {
    const optionsHTML = question.options.map(opt => `
      <label class="option" data-question="${question.id}" data-value="${opt.value}">
        <input type="radio" name="${question.id}" value="${opt.value}">
        <span class="option-content">${opt.text}</span>
      </label>
    `).join('');

    html += `
      <div class="question hidden">
        <div class="question-inner">
          <p><span class="question-number">${index + 1}</span>${question.question}</p>
          ${optionsHTML}
          <button class="hint-btn" data-hint="${question.id}" disabled>💡</button>
          <p class="hint-text" id="hint-${question.id}"></p>
        </div>
      </div>
    `;
  });
  quizForm.innerHTML = html;
}

function showQuestion(index) {
  allQuestions.forEach((question, i) => {
    if (i === index) {
      question.classList.remove('hidden');
    } else {
      question.classList.add('hidden');
    }
  });
}

function showHint(event) {
  event.preventDefault(); 
  const btn = event.target;
  const qKey = btn.dataset.hint;
  
  const questionData = quizData.find(q => q.id === qKey);
  const hintText = questionData ? questionData.hint : "Pista no encontrada.";
  
  const hintElement = document.getElementById(`hint-${qKey}`);
  if (hintElement) {
    hintElement.textContent = hintText;
    hintElement.classList.add('visible'); 
  }
  
  btn.disabled = true;
  btn.classList.remove('unlocked');
  btn.classList.add('used'); // Marcamos como usada
  btn.textContent = '💡'; 
}

function checkAnswer(questionName, selectedValue, optionElement) {
  if (!timerInterval) return;

  const questionData = quizData.find(q => q.id === questionName);
  const correctAnswer = questionData.correctAnswer;
  
  const questionOptions = document.querySelectorAll(`[data-question="${questionName}"]`);
  
  questionOptions.forEach(opt => {
    opt.classList.add('disabled');
    opt.style.pointerEvents = 'none';
    if (opt.dataset.value === correctAnswer) {
      opt.classList.add('correct');
    }
  });

  // Desactivar botón de pista para esta pregunta si no se usó
  const hintBtn = optionElement.closest('.question').querySelector('.hint-btn');
  if (hintBtn) {
    hintBtn.disabled = true;
    hintBtn.textContent = '💡';
    hintBtn.classList.remove('unlocked');
  }
  
  if (selectedValue !== correctAnswer) {
    optionElement.classList.add('incorrect');
    soundIncorrect.play();
  } else {
    score++;
    soundCorrect.play();
    
    // === RECOMPENSA DE TIEMPO ===
    gameTimeLeft += TIME_BONUS;
    if (gameTimeLeft > TOTAL_TIME_SECONDS) {
      gameTimeLeft = TOTAL_TIME_SECONDS;
    }
    updateTimerDisplay();
    checkTimeEffects();
  }
  
  setTimeout(() => {
    currentQuestionIndex++; 
    if (currentQuestionIndex < totalQuestions) {
      // === RESETEAMOS EL TIMER DE PISTA AL CAMBIAR DE PREGUNTA ===
      hintTimeLeft = HINT_COOLDOWN_SECONDS;
      // ------------------------------------------------------------
      showQuestion(currentQuestionIndex); 
    } else {
      showFinalResult(false); 
    }
  }, 1000); 
}

function showFinalResult(isTimeUp) {
  stopTimer(); 
  
  musicBackground.pause();
  musicBackground.currentTime = 0;
  
  let emoji = '🎉';
  let message = '¡Genial!';
  const percentage = (score / totalQuestions) * 100;

  if (isTimeUp) {
    emoji = '⌛';
    message = '¡Se acabó el tiempo!';
    soundTimeUp.play();
  } else if (percentage === 100) {
    emoji = '🏆';
    message = '¡Perfecto!';
  } else if (percentage >= 80) {
    emoji = '😊';
    message = '¡Muy bien!';
  } else if (percentage >= 60) {
    emoji = '🤔';
    message = '¡Aprobado!';
  } else {
    emoji = '📚';
    message = '¡Sigue practicando!';
  }
  
  resultDiv.innerHTML = `
    <span class="score-emoji">${emoji}</span>
    ${message}<br>
    Puntaje: ${score}/${totalQuestions} (${percentage.toFixed(0)}%)
  `;
  resultDiv.style.display = 'block';
  
  allOptions.forEach(opt => {
    opt.classList.add('disabled');
    opt.style.pointerEvents = 'none';
  });

  resetBtn.style.display = 'block';
  resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetQuiz() {
  musicBackground.pause();
  musicBackground.currentTime = 0;

  score = 0;
  
  allOptions.forEach(opt => {
    opt.classList.remove('correct', 'incorrect', 'disabled');
    opt.style.pointerEvents = 'auto';
    const radio = opt.querySelector('input[type="radio"]');
    if (radio) radio.checked = false;
  });

  allHintButtons.forEach(btn => {
    btn.disabled = true;
    btn.classList.remove('unlocked', 'used');
    btn.style.opacity = ''; 
    btn.style.transform = '';
    btn.textContent = '💡'; 
  });
  
  document.querySelectorAll('.hint-text').forEach(el => {
    el.textContent = '';
    el.classList.remove('visible');
  });
  
  resultDiv.style.display = 'none';
  resetBtn.style.display = 'none';
  quizContainer.classList.remove('timer-warning', 'timer-danger');
  
  startTimer(); 
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function initQuiz() {
  resultDiv = document.getElementById('result');
  resetBtn = document.getElementById('reset-btn');
  nextBtn = document.getElementById('next-btn');
  quizContainer = document.getElementById('quiz-container');
  quizForm = document.getElementById('quiz-form');
  timerBar = document.getElementById('timer-bar');
  timerBarDelay = document.getElementById('timer-bar-delay');
  timerText = document.getElementById('timer-text');
  
  try {
    const response = await fetch('/quiz-data.json');
    if (!response.ok) throw new Error('No se pudo cargar quiz-data.json');
    quizData = await response.json();
    totalQuestions = quizData.length;
  } catch (error) {
    console.error("Error al cargar el quiz:", error);
    quizForm.innerHTML = "<p>Error al cargar las preguntas.</p>";
    return;
  }

  buildQuizHTML();

  allOptions = document.querySelectorAll('.option');
  allQuestions = document.querySelectorAll('.question');
  allHintButtons = document.querySelectorAll('.hint-btn');

  allOptions.forEach(option => {
    option.addEventListener('click', function(e) {
      if (this.classList.contains('disabled')) return;
      const radio = this.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        const questionName = this.dataset.question;
        const selectedValue = this.dataset.value;
        checkAnswer(questionName, selectedValue, this);
      }
    });
  });

  resetBtn.addEventListener('click', resetQuiz);
  allHintButtons.forEach(btn => {
    btn.addEventListener('click', showHint);
  });

  startTimer();
}

document.addEventListener('DOMContentLoaded', initQuiz);