/**
 * التطبيق الرئيسي للعبة "LE REPAIRE (الوكر)"
 * إدارة الأدوار، التلميحات، توزيع الكلمات، المؤقت، والتصويت باللغة العربية
 */

// ==========================================================
// حالة اللعبة (GAME STATE)
// ==========================================================
const state = {
    players: [],
    imposterCount: 1,
    hintMode: 'subtle', // 'subtle' | 'category' | 'undercover' | 'none'
    selectedCategories: ['plats_algeriens', 'lieux_algerie', 'lieux_monde', 'personnages_algeriens', 'personnages_monde'],
    customWords: [],
    
    // الجلسة الحالية
    currentWordData: null,
    currentRevealIndex: 0,
    starterPlayerIndex: 0,
    selectedForElimination: null,
    imposterGuessedCorrectly: false,

    // المؤقت
    timerSeconds: 120,
    timerRemaining: 120,
    timerInterval: null,
    timerRunning: false
};

// ==========================================================
// تهيئة التطبيق
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    loadSavedData();
    initUI();
    renderPlayersList();
    renderCategories();
    updateImposterConstraints();
});

/**
 * تحميل البيانات المحفوظة محلياً في المتصفح
 */
function loadSavedData() {
    const savedPlayers = localStorage.getItem('el_imposter_players_ar');
    if (savedPlayers) {
        try {
            state.players = JSON.parse(savedPlayers);
        } catch (e) {
            state.players = [];
        }
    }
    
    // إذا لم تكن هناك بيانات سابقة، نضع 4 لاعبين افتراضيين بأسماء جزائرية
    if (!state.players || state.players.length < 3) {
        state.players = [
            { id: 1, name: "أمين", avatar: "🦁", isImposter: false, secretWord: "", hint: "", isEliminated: false },
            { id: 2, name: "سارة", avatar: "🦅", isImposter: false, secretWord: "", hint: "", isEliminated: false },
            { id: 3, name: "مهدي", avatar: "🦊", isImposter: false, secretWord: "", hint: "", isEliminated: false },
            { id: 4, name: "ياسمين", avatar: "👑", isImposter: false, secretWord: "", hint: "", isEliminated: false }
        ];
    }

    // الكلمات المخصصة
    const savedCustomWords = localStorage.getItem('el_imposter_custom_words_ar');
    if (savedCustomWords) {
        try {
            state.customWords = JSON.parse(savedCustomWords);
        } catch (e) {
            state.customWords = [];
        }
    }
}

/**
 * حفظ قائمة اللاعبين
 */
function savePlayers() {
    localStorage.setItem('el_imposter_players_ar', JSON.stringify(state.players));
}

/**
 * ربط عناصر واجهة المستخدم بالأحداث
 */
function initUI() {
    // كتم وتشغيل الصوت
    const btnSound = document.getElementById('btn-sound');
    btnSound.addEventListener('click', () => {
        const isMuted = Sound.toggleMute();
        btnSound.textContent = isMuted ? '🔇' : '🔊';
        btnSound.title = isMuted ? 'الصوت مكتوم' : 'الصوت مفعل';
        if (!isMuted) Sound.playClick();
    });

    // نافذة القواعد
    const btnRules = document.getElementById('btn-rules');
    const modalRules = document.getElementById('modal-rules');
    const btnCloseRules = document.getElementById('btn-close-rules');
    const btnRulesOk = document.getElementById('btn-rules-ok');

    btnRules.addEventListener('click', () => {
        Sound.playClick();
        modalRules.classList.remove('hidden');
    });
    btnCloseRules.addEventListener('click', () => modalRules.classList.add('hidden'));
    btnRulesOk.addEventListener('click', () => modalRules.classList.add('hidden'));

    // نافذة الكلمات المخصصة
    const btnCustomWords = document.getElementById('btn-custom-words');
    const modalCustomWords = document.getElementById('modal-custom-words');
    const btnCloseCustom = document.getElementById('btn-close-custom');

    btnCustomWords.addEventListener('click', () => {
        Sound.playClick();
        renderCustomWordsList();
        modalCustomWords.classList.remove('hidden');
    });
    btnCloseCustom.addEventListener('click', () => modalCustomWords.classList.add('hidden'));

    // إضافة كلمة مخصصة
    const formAddWord = document.getElementById('form-add-word');
    formAddWord.addEventListener('submit', (e) => {
        e.preventDefault();
        const cat = document.getElementById('custom-word-cat').value;
        const word = document.getElementById('custom-word-name').value.trim();
        const hint = document.getElementById('custom-word-hint').value.trim();

        if (word && hint) {
            state.customWords.push({ cat, word, hint, trap: "" });
            localStorage.setItem('el_imposter_custom_words_ar', JSON.stringify(state.customWords));
            formAddWord.reset();
            renderCustomWordsList();
            renderCategories();
            Sound.playInnocentChime();
        }
    });

    // إضافة لاعب وتوليد أسماء عشوائية
    document.getElementById('btn-add-player').addEventListener('click', addPlayer);
    document.getElementById('btn-random-names').addEventListener('click', fillAlgerianNames);

    // عداد المحتالين
    document.getElementById('btn-minus-imposter').addEventListener('click', () => {
        if (state.imposterCount > 1) {
            state.imposterCount--;
            Sound.playClick();
            updateImpostersDisplay();
        }
    });

    document.getElementById('btn-plus-imposter').addEventListener('click', () => {
        const max = Math.floor((state.players.length - 1) / 2) || 1;
        if (state.imposterCount < max) {
            state.imposterCount++;
            Sound.playClick();
            updateImpostersDisplay();
        }
    });

    // نمط التلميح
    const hintRadios = document.querySelectorAll('input[name="hint-mode"]');
    hintRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.hintMode = e.target.value;
            Sound.playClick();
            document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
            e.target.closest('.radio-card').classList.add('selected');
        });
    });

    // تحديد أو إلغاء تحديد كل الأصناف
    document.getElementById('btn-select-all-cat').addEventListener('click', toggleAllCategories);

    // زر إطلاق اللعبة
    document.getElementById('btn-start-game').addEventListener('click', startGame);

    // كشف الدور السري
    document.getElementById('btn-trigger-reveal').addEventListener('click', revealSecretCard);
    document.getElementById('btn-hide-and-next').addEventListener('click', hideAndNextPlayer);

    // المؤقت
    document.getElementById('btn-timer-toggle').addEventListener('click', toggleTimer);
    document.getElementById('btn-timer-reset').addEventListener('click', resetTimer);
    document.getElementById('btn-go-to-vote').addEventListener('click', () => {
        Sound.playClick();
        pauseTimer();
        switchScreen('screen-vote');
        renderVoteScreen();
    });

    // التصويت
    document.getElementById('btn-confirm-eliminate').addEventListener('click', confirmElimination);

    // متابعة بعد الحكم وتخمين المحتال
    document.getElementById('btn-continue-after-verdict').addEventListener('click', handleContinueAfterVerdict);
    document.getElementById('btn-submit-guess').addEventListener('click', handleImposterGuess);

    // نهاية اللعبة
    document.getElementById('btn-replay-same').addEventListener('click', replaySamePlayers);
    document.getElementById('btn-new-game-setup').addEventListener('click', () => {
        Sound.playClick();
        switchScreen('screen-setup');
    });
}

// ==========================================================
// إدارة اللاعبين
// ==========================================================
function renderPlayersList() {
    const container = document.getElementById('players-container');
    container.innerHTML = '';

    state.players.forEach((player, index) => {
        const row = document.createElement('div');
        row.className = 'player-item-row';
        row.innerHTML = `
            <span class="player-avatar-badge" title="اضغط لتغيير الأيقونة">${player.avatar}</span>
            <input type="text" class="player-name-input" value="${escapeHtml(player.name)}" placeholder="اسم اللاعب ${index + 1}" maxlength="20">
            ${state.players.length > 3 ? `<button type="button" class="btn-remove-player" title="حذف اللاعب">&times;</button>` : ''}
        `;

        // تغيير الأفاتار عند الضغط
        const avatarBadge = row.querySelector('.player-avatar-badge');
        avatarBadge.addEventListener('click', () => {
            const currentIdx = PLAYER_AVATARS.indexOf(player.avatar);
            const nextIdx = (currentIdx + 1) % PLAYER_AVATARS.length;
            player.avatar = PLAYER_AVATARS[nextIdx];
            avatarBadge.textContent = player.avatar;
            Sound.playClick();
            savePlayers();
        });

        // تعديل الاسم
        const input = row.querySelector('.player-name-input');
        input.addEventListener('input', (e) => {
            player.name = e.target.value;
            savePlayers();
        });

        // حذف اللاعب
        const removeBtn = row.querySelector('.btn-remove-player');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                state.players.splice(index, 1);
                Sound.playClick();
                savePlayers();
                renderPlayersList();
                updateImposterConstraints();
            });
        }

        container.appendChild(row);
    });

    document.getElementById('players-count-label').textContent = `${state.players.length} لاعبين مسجلين`;
}

function addPlayer() {
    if (state.players.length >= 16) {
        alert("الحد الأقصى هو 16 لاعباً !");
        return;
    }
    const nextAvatar = PLAYER_AVATARS[state.players.length % PLAYER_AVATARS.length];
    const newPlayer = {
        id: Date.now() + Math.random(),
        name: `لاعب ${state.players.length + 1}`,
        avatar: nextAvatar,
        isImposter: false,
        secretWord: "",
        hint: "",
        isEliminated: false
    };

    state.players.push(newPlayer);
    Sound.playClick();
    savePlayers();
    renderPlayersList();
    updateImposterConstraints();
}

function fillAlgerianNames() {
    Sound.playInnocentChime();
    const shuffled = [...DEFAULT_ALGERIAN_NAMES_AR].sort(() => 0.5 - Math.random());
    state.players.forEach((p, idx) => {
        p.name = shuffled[idx % shuffled.length] || `لاعب ${idx + 1}`;
    });
    savePlayers();
    renderPlayersList();
}

function updateImposterConstraints() {
    const maxImposters = Math.max(1, Math.floor((state.players.length - 1) / 2));
    if (state.imposterCount > maxImposters) {
        state.imposterCount = maxImposters;
    }
    updateImpostersDisplay();
}

function updateImpostersDisplay() {
    const maxImposters = Math.max(1, Math.floor((state.players.length - 1) / 2));
    document.getElementById('imposter-count-val').textContent = state.imposterCount;

    const recLabel = document.getElementById('imposters-recommendation');
    if (state.players.length <= 5) {
        recLabel.textContent = `المستحسن : محتال واحد (الحد الأقصى: ${maxImposters})`;
    } else if (state.players.length <= 8) {
        recLabel.textContent = `المستحسن : 1 أو 2 محتالين (الحد الأقصى: ${maxImposters})`;
    } else {
        recLabel.textContent = `المستحسن : 2 أو 3 محتالين (الحد الأقصى: ${maxImposters})`;
    }
}

// ==========================================================
// إدارة الأصناف والمواضيع
// ==========================================================
function renderCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';

    // الأصناف الأساسية
    Object.keys(GAME_WORDS_AR).forEach(key => {
        const cat = GAME_WORDS_AR[key];
        const isChecked = state.selectedCategories.includes(key);

        const card = document.createElement('div');
        card.className = `category-toggle-card ${isChecked ? 'checked' : ''}`;
        card.innerHTML = `
            <div class="cat-left-info">
                <input type="checkbox" class="cat-checkbox" ${isChecked ? 'checked' : ''}>
                <span class="cat-name">${cat.name}</span>
            </div>
            <span class="cat-count">${cat.words.length} كلمة</span>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                const cb = card.querySelector('.cat-checkbox');
                cb.checked = !cb.checked;
            }
            toggleCategoryKey(key, card.querySelector('.cat-checkbox').checked, card);
        });

        container.appendChild(card);
    });

    // صنف الكلمات المخصصة إن وجدت
    if (state.customWords && state.customWords.length > 0) {
        const isCustomChecked = state.selectedCategories.includes('custom_words');
        const customCard = document.createElement('div');
        customCard.className = `category-toggle-card ${isCustomChecked ? 'checked' : ''}`;
        customCard.innerHTML = `
            <div class="cat-left-info">
                <input type="checkbox" class="cat-checkbox" ${isCustomChecked ? 'checked' : ''}>
                <span class="cat-name">✨ كلماتي المضافة الخاصة</span>
            </div>
            <span class="cat-count">${state.customWords.length} كلمة</span>
        `;

        customCard.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                const cb = customCard.querySelector('.cat-checkbox');
                cb.checked = !cb.checked;
            }
            toggleCategoryKey('custom_words', customCard.querySelector('.cat-checkbox').checked, customCard);
        });

        container.appendChild(customCard);
    }
}

function toggleCategoryKey(key, checked, cardEl) {
    Sound.playClick();
    if (checked) {
        if (!state.selectedCategories.includes(key)) state.selectedCategories.push(key);
        cardEl.classList.add('checked');
    } else {
        state.selectedCategories = state.selectedCategories.filter(k => k !== key);
        cardEl.classList.remove('checked');
    }
}

function toggleAllCategories() {
    Sound.playClick();
    const allKeys = Object.keys(GAME_WORDS_AR);
    if (state.customWords && state.customWords.length > 0) allKeys.push('custom_words');

    if (state.selectedCategories.length === allKeys.length) {
        state.selectedCategories = [];
        document.getElementById('btn-select-all-cat').textContent = "تحديد الكل";
    } else {
        state.selectedCategories = [...allKeys];
        document.getElementById('btn-select-all-cat').textContent = "إلغاء تحديد الكل";
    }
    renderCategories();
}

function renderCustomWordsList() {
    const listEl = document.getElementById('custom-words-list');
    document.getElementById('custom-words-count').textContent = state.customWords.length;
    listEl.innerHTML = '';

    if (state.customWords.length === 0) {
        listEl.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem;text-align:center;">لا توجد كلمات مخصصة حالياً.</p>`;
        return;
    }

    state.customWords.forEach((item, idx) => {
        const itemRow = document.createElement('div');
        itemRow.className = 'custom-word-item';
        itemRow.innerHTML = `
            <div>
                <strong>${escapeHtml(item.word)}</strong>
                <span style="color:var(--text-secondary);display:block;font-size:0.8rem;">${escapeHtml(item.hint)}</span>
            </div>
            <button type="button" class="btn-del-custom" title="حذف">&times;</button>
        `;

        itemRow.querySelector('.btn-del-custom').addEventListener('click', () => {
            state.customWords.splice(idx, 1);
            localStorage.setItem('el_imposter_custom_words_ar', JSON.stringify(state.customWords));
            renderCustomWordsList();
            renderCategories();
        });

        listEl.appendChild(itemRow);
    });
}

// ==========================================================
// انطلاق اللعبة وتوزيع الأدوار
// ==========================================================
function startGame() {
    // التحقق من عدد وأسماء اللاعبين
    if (state.players.length < 3) {
        alert("يجب أن يكون هناك 3 لاعبين على الأقل لبدء اللعبة !");
        return;
    }

    for (let p of state.players) {
        if (!p.name || p.name.trim() === '') {
            alert("يرجى إدخال أسماء جميع اللاعبين.");
            return;
        }
        p.name = p.name.trim();
        p.isEliminated = false;
    }

    // التحقق من الأصناف
    if (state.selectedCategories.length === 0) {
        alert("يرجى اختيار صنف وموضوع واحد على الأقل للعب !");
        return;
    }

    // سحب كلمة عشوائية من الأصناف المختارة
    const wordPool = [];
    state.selectedCategories.forEach(catKey => {
        if (catKey === 'custom_words' && state.customWords) {
            state.customWords.forEach(w => wordPool.push({
                word: w.word,
                hint: w.hint,
                trap: w.trap || w.word,
                catName: "✨ كلماتي المضافة"
            }));
        } else if (GAME_WORDS_AR[catKey]) {
            const cat = GAME_WORDS_AR[catKey];
            cat.words.forEach(w => wordPool.push({
                word: w.word,
                hint: w.hint,
                trap: w.trap || w.word,
                catName: cat.name
            }));
        }
    });

    if (wordPool.length === 0) {
        alert("لم يتم العثور على أي كلمات في الأصناف المحددة.");
        return;
    }

    const chosenWord = wordPool[Math.floor(Math.random() * wordPool.length)];
    state.currentWordData = chosenWord;

    // تهيئة أدوار الأبرياء
    state.players.forEach(p => {
        p.isImposter = false;
        p.secretWord = chosenWord.word;
        p.hint = chosenWord.hint;
    });

    // اختيار المحتالين عشوائياً
    const shuffledIndexes = [...Array(state.players.length).keys()].sort(() => 0.5 - Math.random());
    const imposterIndexes = shuffledIndexes.slice(0, state.imposterCount);

    imposterIndexes.forEach(idx => {
        state.players[idx].isImposter = true;
    });

    // اختيار عشوائي لأول لاعب يبدأ الكلام
    state.starterPlayerIndex = Math.floor(Math.random() * state.players.length);

    // بدء مرحلة كشف الأدوار
    state.currentRevealIndex = 0;
    state.imposterGuessedCorrectly = false;
    Sound.playInnocentChime();

    switchScreen('screen-reveal');
    setupRevealCardForCurrentPlayer();
}

function setupRevealCardForCurrentPlayer() {
    const player = state.players[state.currentRevealIndex];
    const total = state.players.length;

    // شريط التقدم
    document.getElementById('reveal-progress-text').textContent = `اللاعب ${state.currentRevealIndex + 1} من ${total}`;
    const pct = ((state.currentRevealIndex + 1) / total) * 100;
    document.getElementById('reveal-progress-bar').style.width = `${pct}%`;

    // بيانات اللاعب
    document.getElementById('reveal-player-avatar').textContent = player.avatar;
    document.getElementById('reveal-player-name').textContent = player.name;

    // إخفاء البطاقة السرية وإظهار بطاقة التحذير
    document.getElementById('pass-prompt-card').classList.remove('hidden');
    document.getElementById('secret-card-revealed').classList.add('hidden');
}

function revealSecretCard() {
    const player = state.players[state.currentRevealIndex];
    const roleBadge = document.getElementById('secret-role-badge');
    const wordBox = document.getElementById('secret-word-display');
    const hintContainer = document.getElementById('secret-hint-container');
    const hintText = document.getElementById('secret-hint-text');
    const adviceText = document.getElementById('secret-advice-text');
    const catName = document.getElementById('secret-category-name');

    catName.textContent = state.currentWordData.catName;

    if (player.isImposter) {
        Sound.playImposterAlarm();
        roleBadge.className = 'role-badge imposter';
        roleBadge.textContent = '🚨 أنت المحتال (الدخيل) !';

        if (state.hintMode === 'undercover') {
            wordBox.className = 'secret-word-text';
            wordBox.textContent = state.currentWordData.trap || state.currentWordData.word;
            hintContainer.classList.remove('hidden');
            hintText.textContent = "انتبه: لديك كلمة فخ قريبة جداً من كلمة الآخرين ! راوغ بهدوء وتظاهر بأنك تعرف كلمتهم.";
            adviceText.textContent = "استمع إلى ما يقوله الآخرون وحاول رصد الفروق الدقيقة دون أن تُكشف !";
        } else if (state.hintMode === 'subtle') {
            wordBox.className = 'secret-word-text imposter-text';
            wordBox.textContent = 'محتال 🕵️';
            hintContainer.classList.remove('hidden');
            hintText.textContent = state.currentWordData.hint;
            adviceText.textContent = "ليس لديك الكلمة الأصلية، لكن هذا التلميح سيساعدك على المناورة وخداع الجميع !";
        } else if (state.hintMode === 'category') {
            wordBox.className = 'secret-word-text imposter-text';
            wordBox.textContent = 'محتال 🕵️';
            hintContainer.classList.remove('hidden');
            hintText.textContent = `الكلمة تنتمي إلى صنف : ${state.currentWordData.catName}`;
            adviceText.textContent = "استمع بدقة لوصف اللاعبين لتستنتج الكلمة وتندمج معهم !";
        } else {
            // نمط بدون تلميح (Hardcore)
            wordBox.className = 'secret-word-text imposter-text';
            wordBox.textContent = 'محتال 🕵️';
            hintContainer.classList.add('hidden');
            adviceText.textContent = "لا تملك أي تلميح ! راقب الجميع بدهاء واستخدم عبارات عامة وذكية لتنجو !";
        }
    } else {
        // بريء
        Sound.playInnocentChime();
        roleBadge.className = 'role-badge innocent';
        roleBadge.textContent = '😇 أنت بريء';

        wordBox.className = 'secret-word-text';
        wordBox.textContent = state.currentWordData.word;
        hintContainer.classList.add('hidden');
        adviceText.textContent = "صف هذه الكلمة بحكمة وإيجاز حتى يفهمك الأبرياء دون أن تكشفها للمحتال !";
    }

    document.getElementById('pass-prompt-card').classList.add('hidden');
    document.getElementById('secret-card-revealed').classList.remove('hidden');
}

function hideAndNextPlayer() {
    Sound.playCardFlip();
    state.currentRevealIndex++;

    if (state.currentRevealIndex < state.players.length) {
        setupRevealCardForCurrentPlayer();
    } else {
        // الجميع رأى دوره، ننتقل لطاولة الحوار
        startDiscussionPhase();
    }
}

// ==========================================================
// مرحلة الحوار والنقاش
// ==========================================================
function startDiscussionPhase() {
    switchScreen('screen-discuss');
    Sound.playVictory();

    // أول متحدث
    const starter = state.players[state.starterPlayerIndex];
    document.getElementById('starter-player-name').textContent = `${starter.avatar} ${starter.name}`;

    // إعادة ضبط المؤقت
    resetTimer();

    // قائمة اللاعبين الحاضرين
    renderAlivePlayers();
}

function renderAlivePlayers() {
    const container = document.getElementById('alive-players-list');
    container.innerHTML = '';

    state.players.forEach(p => {
        const tag = document.createElement('div');
        tag.className = `alive-player-tag ${p.isEliminated ? 'eliminated' : ''}`;
        tag.innerHTML = `<span>${p.avatar}</span> <span>${escapeHtml(p.name)}</span>`;
        container.appendChild(tag);
    });
}

// ==========================================================
// المؤقت التنازلي
// ==========================================================
function toggleTimer() {
    if (state.timerRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    state.timerRunning = true;
    document.getElementById('btn-timer-toggle').textContent = "إيقاف مؤقت ⏸️";
    Sound.playClick();

    state.timerInterval = setInterval(() => {
        state.timerRemaining--;
        updateTimerDisplay();

        if (state.timerRemaining <= 10 && state.timerRemaining > 0) {
            Sound.playTick();
        }

        if (state.timerRemaining <= 0) {
            pauseTimer();
            Sound.playImposterAlarm();
            alert("⏰ انتهى وقت الحوار ! حان وقت كشف وتصويت المشتبه بهم !");
        }
    }, 1000);
}

function pauseTimer() {
    state.timerRunning = false;
    clearInterval(state.timerInterval);
    document.getElementById('btn-timer-toggle').textContent = "استئناف ▶️";
}

function resetTimer() {
    pauseTimer();
    state.timerRemaining = state.timerSeconds;
    updateTimerDisplay();
    document.getElementById('btn-timer-toggle').textContent = "بدء المؤقت ⏱️";
}

function updateTimerDisplay() {
    const mins = Math.floor(state.timerRemaining / 60);
    const secs = state.timerRemaining % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const display = document.getElementById('timer-display');
    display.textContent = formatted;

    if (state.timerRemaining <= 15) {
        display.classList.add('danger');
    } else {
        display.classList.remove('danger');
    }
}

// ==========================================================
// مرحلة التصويت والإقصاء
// ==========================================================
function renderVoteScreen() {
    const grid = document.getElementById('vote-players-grid');
    grid.innerHTML = '';
    state.selectedForElimination = null;

    const btnConfirm = document.getElementById('btn-confirm-eliminate');
    btnConfirm.disabled = true;
    btnConfirm.classList.add('disabled');
    btnConfirm.textContent = "يرجى اختيار لاعب للتصويت عليه ⚖️";

    const alivePlayers = state.players.filter(p => !p.isEliminated);

    alivePlayers.forEach(p => {
        const card = document.createElement('div');
        card.className = 'vote-card';
        card.innerHTML = `
            <div class="vote-card-avatar">${p.avatar}</div>
            <div class="vote-card-name">${escapeHtml(p.name)}</div>
        `;

        card.addEventListener('click', () => {
            Sound.playClick();
            document.querySelectorAll('.vote-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            state.selectedForElimination = p;

            btnConfirm.disabled = false;
            btnConfirm.classList.remove('disabled');
            btnConfirm.textContent = `التصويت لإقصاء ${p.name} ⚖️`;
        });

        grid.appendChild(card);
    });
}

function confirmElimination() {
    if (!state.selectedForElimination) return;

    const player = state.selectedForElimination;
    Sound.playClick();

    const modal = document.getElementById('modal-elimination');
    const suspenseView = document.getElementById('suspense-view');
    const verdictView = document.getElementById('verdict-view');
    const guessSection = document.getElementById('imposter-guess-section');
    const guessFeedback = document.getElementById('guess-result-msg');

    modal.classList.remove('hidden');
    suspenseView.classList.remove('hidden');
    verdictView.classList.add('hidden');
    guessSection.classList.add('hidden');
    guessFeedback.classList.add('hidden');
    document.getElementById('input-imposter-guess').value = '';

    // مدة تشويق 1.6 ثانية
    setTimeout(() => {
        suspenseView.classList.add('hidden');
        verdictView.classList.remove('hidden');

        document.getElementById('verdict-avatar').textContent = player.avatar;
        document.getElementById('verdict-player-name').textContent = player.name;

        const badge = document.getElementById('verdict-role-badge');
        const detail = document.getElementById('verdict-detail-text');

        player.isEliminated = true;

        if (player.isImposter) {
            Sound.playImposterAlarm();
            badge.className = 'verdict-badge imposter-verdict';
            badge.textContent = '🚨 كان هو المحتال !';
            detail.textContent = "أحسنتم ! تم كشف المحتال الدخيل وطرده من المجموعة.";

            // إعطاء فرصة أخيرة للمحتال
            guessSection.classList.remove('hidden');
        } else {
            Sound.playEliminated();
            badge.className = 'verdict-badge innocent-verdict';
            badge.textContent = '😢 كان بريئاً مسكيناً...';
            detail.textContent = "يا للأسف ! لقد صوّتم ضد شخص بريء تماماً !";
        }
    }, 1600);
}

/**
 * محاولة المحتال تخمين الكلمة السرية
 */
function handleImposterGuess() {
    const input = document.getElementById('input-imposter-guess');
    const feedback = document.getElementById('guess-result-msg');
    const guess = input.value.trim();

    if (!guess) return;

    const actualWord = state.currentWordData.word;
    const isCorrect = isFuzzyMatch(guess, actualWord);

    feedback.classList.remove('hidden');

    if (isCorrect) {
        Sound.playVictory();
        feedback.className = 'guess-feedback success';
        feedback.textContent = `🎯 لا يُصدق ! الكلمة الصحيحة هي بالفعل "${actualWord}" ! المحتال يخطف الفوز رغم إقصائه !`;
        state.imposterGuessedCorrectly = true;
        document.getElementById('btn-submit-guess').disabled = true;
    } else {
        Sound.playEliminated();
        feedback.className = 'guess-feedback failed';
        feedback.textContent = `❌ إجابة خاطئة ! الكلمة ليست "${guess}". يحتفظ الأبرياء بتقدمهم.`;
        document.getElementById('btn-submit-guess').disabled = true;
    }
}

/**
 * متابعة اللعبة بعد الحكم
 */
function handleContinueAfterVerdict() {
    Sound.playClick();
    document.getElementById('modal-elimination').classList.add('hidden');

    const alivePlayers = state.players.filter(p => !p.isEliminated);
    const aliveImposters = alivePlayers.filter(p => p.isImposter);
    const aliveInnocents = alivePlayers.filter(p => !p.isImposter);

    // 1. هل حزر المحتال الكلمة ؟
    if (state.imposterGuessedCorrectly) {
        showGameOver(false, "تمكن المحتال من تخمين الكلمة السرية في فرصته الأخيرة وسرق الفوز !");
        return;
    }

    // 2. هل تم إقصاء جميع المحتالين ؟
    if (aliveImposters.length === 0) {
        showGameOver(true, "تم القضاء على جميع المحتالين بنجاح !");
        return;
    }

    // 3. هل تساوى عدد المحتالين مع الأبرياء أو فاقوهم ؟
    if (aliveImposters.length >= aliveInnocents.length) {
        showGameOver(false, "أصبح عدد المحتالين مساوياً للأبرياء وسيطروا على الطاولة بالكامل !");
        return;
    }

    // 4. لا زال هناك محتال واللعبة مستمرة
    alert(`لا زال هناك ${aliveImposters.length} محتال(ين) متخفٍّ بين الـ ${alivePlayers.length} لاعبين الباقين ! يستمر الحوار.`);
    switchScreen('screen-discuss');
    renderAlivePlayers();
}

// ==========================================================
// شاشة نهاية اللعبة والملخص
// ==========================================================
function showGameOver(innocentsWon, reason) {
    switchScreen('screen-gameover');

    const trophy = document.getElementById('gameover-icon');
    const title = document.getElementById('gameover-title');
    const subtitle = document.getElementById('gameover-subtitle');

    if (innocentsWon) {
        Sound.playVictory();
        trophy.textContent = "🏆";
        title.textContent = "انتصار الأبرياء !";
        title.style.color = "var(--color-green)";
        subtitle.textContent = reason;
    } else {
        Sound.playImposterAlarm();
        trophy.textContent = "😈";
        title.textContent = "انتصار المحتال !";
        title.style.color = "var(--color-red)";
        subtitle.textContent = reason;
    }

    // الكلمة السرية
    document.getElementById('recap-category-name').textContent = state.currentWordData.catName;
    document.getElementById('recap-secret-word').textContent = state.currentWordData.word;
    document.getElementById('recap-secret-hint').textContent = `💡 التلميح : ${state.currentWordData.hint}`;

    // أدوار اللاعبين
    const rolesContainer = document.getElementById('recap-roles-container');
    rolesContainer.innerHTML = '';

    state.players.forEach(p => {
        const row = document.createElement('div');
        row.className = 'role-recap-row';
        row.innerHTML = `
            <div>
                <span>${p.avatar}</span>
                <strong>${escapeHtml(p.name)}</strong>
                ${p.isEliminated ? '<span style="color:var(--text-muted);font-size:0.85rem;"> (تم إقصاؤه)</span>' : ''}
            </div>
            <span class="${p.isImposter ? 'role-tag-imposter' : 'role-tag-innocent'}">
                ${p.isImposter ? 'محتال 🕵️' : 'بريء 😇'}
            </span>
        `;
        rolesContainer.appendChild(row);
    });
}

function replaySamePlayers() {
    Sound.playClick();
    startGame();
}

// ==========================================================
// أدوات مساعدة
// ==========================================================
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}

/**
 * مطابقة مرنة للكلمات (إهمال التشكيل والهمزات والتاء المربوطة والألف)
 */
function isFuzzyMatch(str1, str2) {
    const clean = s => s.toLowerCase()
        .normalize("NFD")
        .replace(/[\u064B-\u065F\u0670]/g, "") // إزالة حركات التشكيل
        .replace(/[إأآا]/g, "ا")
        .replace(/[ة]/g, "ه")
        .replace(/[ى]/g, "ي")
        .replace(/[\(\)\[\]\-\_\.\,]/g, "")
        .replace(/\s+/g, "")
        .replace(/ال/g, ""); // مقارنة دون ال التعريف للسهولة
        
    const c1 = clean(str1);
    const c2 = clean(str2);
    return c1.length > 2 && (c1.includes(c2) || c2.includes(c1));
}
