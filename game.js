// ゲーム状態
let gameState = {
    currentNumbers: [],
    level: 1,
    solutions: [],
    lastButtonType: null, // 最後に押したボタンの種類を記録
    solutionShown: false, // 現在の問題で解答例を表示したかどうか
    feedbackTimer: null, // フィードバック表示のタイマーID
    inactivityTimer: null,
    isSleeping: false,
    mascotPokeCount: 0,
    pokeResetTimer: null,
    // タイマー関連
    startTime: null, // ゲーム開始時刻
    timerInterval: null, // タイマー更新用のインターバルID
    timerPaused: true, // タイマーが一時停止中かどうか
    // レベルごとの統計情報
    levelStats: {
        1: { totalAttempts: 0, correctAnswers: 0, streak: 0, currentProblemIndex: 0, shownSolutions: new Set(), answerHistory: {} },
        2: { totalAttempts: 0, correctAnswers: 0, streak: 0, currentProblemIndex: 0, shownSolutions: new Set(), answerHistory: {} },
        3: { totalAttempts: 0, correctAnswers: 0, streak: 0, currentProblemIndex: 0, shownSolutions: new Set(), answerHistory: {} }
    }
};

// レベル別の数字生成設定
const levelConfig = {
    1: { min: 1, max: 9, operators: ['+', '-', '*', '/', '(', ')'], requiresParentheses: false },
    2: { min: 1, max: 12, operators: ['+', '-', '*', '/', '(', ')'], requiresParentheses: true },
    3: { min: 1, max: 13, operators: ['+', '-', '*', '/', '(', ')'], requiresParentheses: true }
};

// 半角数字を全角数字に変換
function toFullWidth(num) {
    return String(num).replace(/[0-9]/g, (s) => String.fromCharCode(s.charCodeAt(0) + 0xFEE0));
}

// レベル別の問題リスト
const levelProblems = {
    1: [], // レベル1の問題（後で設定）
    2: [], // レベル2の問題（後で設定）
    3: []  // レベル3の問題（後で設定）
};

// 既知の解答パターン
const knownSolutions = [
    // レベル1用（括弧なしで解ける問題）- すべて手計算で検証済み
    { numbers: [1, 2, 3, 4], solution: '1 * 2 * 3 * 4' },
    { numbers: [1, 5, 5, 6], solution: '6 * 5 - 5 - 1' },
    { numbers: [1, 7, 8, 8], solution: '1 + 7 + 8 + 8' },
    { numbers: [2, 2, 2, 3], solution: '2 * 2 * 2 * 3' },
    { numbers: [2, 2, 4, 8], solution: '2 * 2 * 4 + 8' },
    { numbers: [2, 2, 6, 6], solution: '2 * 6 + 2 * 6' },
    { numbers: [2, 6, 8, 8], solution: '2 + 6 + 8 + 8' },
    { numbers: [3, 3, 3, 3], solution: '3 * 3 * 3 - 3' },
    { numbers: [3, 3, 4, 4], solution: '3 * 4 + 3 * 4' },
    { numbers: [3, 5, 8, 8], solution: '3 + 5 + 8 + 8' },
    { numbers: [3, 6, 7, 8], solution: '3 + 6 + 7 + 8' },
    { numbers: [4, 4, 4, 4], solution: '4 + 4 + 4 * 4' },
    { numbers: [4, 4, 8, 8], solution: '4 + 4 + 8 + 8' },
    { numbers: [4, 5, 7, 8], solution: '4 + 5 + 7 + 8' },
    { numbers: [5, 5, 5, 5], solution: '5 * 5 - 5 / 5' },
    { numbers: [5, 5, 7, 7], solution: '5 * 5 - 7 / 7' },
    { numbers: [5, 6, 6, 7], solution: '5 + 6 + 6 + 7' },
    { numbers: [6, 6, 6, 6], solution: '6 + 6 + 6 + 6' },
    // レベル2用（×と括弧を使う問題）- 手計算で検証済み
    { numbers: [1, 2, 3, 4], solution: '(1 + 2 + 3) * 4' },      // 6*4 = 24
    { numbers: [1, 2, 6, 6], solution: '(1 + 2) * 6 + 6' },      // 3*6+6 = 24
    { numbers: [2, 2, 6, 8], solution: '(8 - 2) * (6 - 2)' },    // 6*4 = 24
    { numbers: [2, 3, 4, 5], solution: '4 * (5 + 3 - 2)' },      // 4*6 = 24
    { numbers: [2, 4, 5, 6], solution: '(2 + 4) * 5 - 6' },      // 6*5-6 = 24
    { numbers: [3, 4, 5, 6], solution: '6 * (5 - 4 + 3)' },      // 6*4 = 24
    // レベル3用（括弧と÷を使う問題）
    { numbers: [1, 3, 4, 6], solution: '6 / (1 - 3/4)' },
    { numbers: [8, 8, 3, 3], solution: '8 / (3 - 8/3)' },
    { numbers: [1, 5, 5, 5], solution: '5 * (5 - 1/5)' },
    { numbers: [1, 3, 6, 8], solution: '8 * 6 / (3 - 1)' },
    { numbers: [2, 3, 4, 8], solution: '(2 + 4) * 8 / 2' },
    { numbers: [2, 3, 6, 9], solution: '(2 + 6) * 9 / 3' }
];

// 問題リストを初期化
function initializeProblemLists() {
    knownSolutions.forEach(problem => {
        const hasParentheses = problem.solution.includes('(') || problem.solution.includes(')');
        const hasDivision = problem.solution.includes('/');
        const hasMultiplication = problem.solution.includes('*');

        // レベル1: 括弧なしの問題
        if (!hasParentheses) {
            levelProblems[1].push(problem);
        }
        // レベル3: 括弧と÷を両方含む問題（レベル2より優先）
        else if (hasParentheses && hasDivision) {
            levelProblems[3].push(problem);
        }
        // レベル2: ×と括弧を含む問題（÷を含まない）
        else if (hasMultiplication && hasParentheses) {
            levelProblems[2].push(problem);
        }
    });

    // 各レベルの問題を数字の昇順にソート
    for (let level = 1; level <= 3; level++) {
        levelProblems[level].sort((a, b) => {
            const sortedA = [...a.numbers].sort((x, y) => x - y);
            const sortedB = [...b.numbers].sort((x, y) => x - y);

            // 数字を1つずつ比較
            for (let i = 0; i < 4; i++) {
                if (sortedA[i] !== sortedB[i]) {
                    return sortedA[i] - sortedB[i];
                }
            }
            return 0;
        });
    }
}

// 解答不可能な組み合わせ
const impossibleCombinations = [
    // 1が2つ以上含まれる組み合わせ
    [1, 1, 1, 1],
    [1, 1, 1, 2],
    [1, 1, 1, 3],
    [1, 1, 1, 4],
    [1, 1, 1, 5],
    [1, 1, 1, 6],
    [1, 1, 1, 7],
    [1, 1, 1, 8],
    [1, 1, 1, 9],
    [1, 1, 1, 10],
    [1, 1, 1, 11],
    [1, 1, 1, 12],
    [1, 1, 1, 13],
    [1, 1, 2, 2],
    [1, 1, 2, 3],
    [1, 1, 2, 4],
    [1, 1, 2, 5],
    [1, 1, 2, 6],
    [1, 1, 2, 7],
    [1, 1, 2, 8],
    [1, 1, 2, 9],
    [1, 1, 2, 10],
    [1, 1, 2, 11],
    [1, 1, 2, 12],
    [1, 1, 2, 13],
    [1, 1, 3, 3],
    [1, 1, 3, 4],
    [1, 1, 3, 5],
    [1, 1, 3, 6],
    [1, 1, 3, 7],
    [1, 1, 3, 8],
    [1, 1, 3, 9],
    [1, 1, 3, 10],
    [1, 1, 3, 11],
    [1, 1, 3, 12],
    [1, 1, 3, 13],
    [1, 1, 4, 4],
    [1, 1, 4, 5],
    [1, 1, 4, 6],
    [1, 1, 4, 7],
    [1, 1, 4, 8],
    [1, 1, 4, 9],
    [1, 1, 4, 10],
    [1, 1, 4, 11],
    [1, 1, 4, 12],
    [1, 1, 4, 13],
    [1, 1, 5, 5],
    [1, 1, 5, 6],
    [1, 1, 5, 7],
    [1, 1, 5, 8],
    [1, 1, 5, 9],
    [1, 1, 5, 10],
    [1, 1, 5, 11],
    [1, 1, 5, 12],
    [1, 1, 5, 13],
    [1, 1, 6, 6],
    [1, 1, 6, 7],
    [1, 1, 6, 8],
    [1, 1, 6, 9],
    [1, 1, 6, 10],
    [1, 1, 6, 11],
    [1, 1, 6, 12],
    [1, 1, 6, 13],
    [1, 1, 7, 7],
    [1, 1, 7, 8],
    [1, 1, 7, 9],
    [1, 1, 7, 10],
    [1, 1, 7, 11],
    [1, 1, 7, 12],
    [1, 1, 7, 13],
    [1, 1, 8, 8],
    [1, 1, 8, 9],
    [1, 1, 8, 10],
    [1, 1, 8, 11],
    [1, 1, 8, 12],
    [1, 1, 8, 13],
    [1, 1, 9, 9],
    [1, 1, 9, 10],
    [1, 1, 9, 11],
    [1, 1, 9, 12],
    [1, 1, 9, 13],
    [1, 1, 10, 10],
    [1, 1, 10, 11],
    [1, 1, 10, 12],
    [1, 1, 10, 13],
    [1, 1, 11, 11],
    [1, 1, 11, 12],
    [1, 1, 11, 13],
    [1, 1, 12, 12],
    [1, 1, 12, 13],
    [1, 1, 13, 13],

    // 1が1つ含まれる主要な不可能パターン
    [1, 2, 2, 2],
    [1, 2, 2, 3],
    [1, 2, 3, 3],
    [1, 2, 4, 4],
    [1, 2, 5, 5],
    [1, 2, 7, 7],
    [1, 2, 8, 8],
    [1, 2, 9, 9],
    [1, 3, 3, 3],
    [1, 3, 5, 5],
    [1, 3, 7, 7],
    [1, 3, 8, 8],
    [1, 3, 9, 9],
    [1, 4, 4, 4],
    [1, 4, 5, 5],
    [1, 4, 7, 7],
    [1, 4, 8, 8],
    [1, 4, 9, 9],
    [1, 5, 5, 5],
    [1, 5, 5, 6],
    [1, 5, 5, 8],
    [1, 5, 7, 7],
    [1, 5, 8, 8],
    [1, 5, 9, 9],
    [1, 6, 6, 6],
    [1, 6, 6, 7],
    [1, 6, 7, 7],
    [1, 6, 7, 8],
    [1, 6, 8, 8],
    [1, 6, 9, 9],
    [1, 7, 7, 7],
    [1, 7, 7, 8],
    [1, 7, 8, 8],
    [1, 7, 9, 9],
    [1, 8, 8, 8],
    [1, 8, 9, 9],
    [1, 9, 9, 9],

    // 2が含まれる主要な不可能パターン
    [2, 2, 2, 2],
    [2, 2, 2, 3],
    [2, 2, 2, 4],
    [2, 2, 2, 5],
    [2, 2, 2, 6],
    [2, 2, 2, 7],
    [2, 2, 2, 8],
    [2, 2, 2, 9],
    [2, 2, 3, 3],
    [2, 2, 5, 5],
    [2, 2, 7, 7],
    [2, 2, 7, 9],
    [2, 2, 8, 8],
    [2, 2, 9, 9],
    [2, 3, 3, 3],
    [2, 3, 3, 4],
    [2, 3, 5, 5],
    [2, 3, 7, 7],
    [2, 3, 7, 9],
    [2, 3, 8, 8],
    [2, 3, 9, 9],
    [2, 4, 4, 4],
    [2, 4, 7, 7],
    [2, 4, 8, 8],
    [2, 4, 9, 9],
    [2, 5, 5, 5],
    [2, 5, 5, 6],
    [2, 5, 7, 7],
    [2, 5, 8, 8],
    [2, 5, 9, 9],
    [2, 6, 6, 6],
    [2, 6, 7, 7],
    [2, 6, 8, 8],
    [2, 6, 9, 9],
    [2, 7, 7, 7],
    [2, 7, 7, 9],
    [2, 7, 8, 8],
    [2, 7, 9, 9],
    [2, 8, 8, 8],
    [2, 8, 9, 9],
    [2, 9, 9, 9],

    // 3が含まれる主要な不可能パターン
    [3, 3, 3, 3],
    [3, 3, 3, 4],
    [3, 3, 3, 5],
    [3, 3, 3, 6],
    [3, 3, 3, 7],
    [3, 3, 3, 8],
    [3, 3, 3, 9],
    [3, 3, 5, 5],
    [3, 3, 5, 8],
    [3, 3, 7, 7],
    [3, 3, 8, 8],
    [3, 3, 9, 9],
    [3, 4, 4, 4],
    [3, 4, 6, 7],
    [3, 4, 7, 7],
    [3, 4, 8, 8],
    [3, 4, 9, 9],
    [3, 5, 5, 5],
    [3, 5, 7, 7],
    [3, 5, 8, 8],
    [3, 5, 9, 9],
    [3, 6, 6, 6],
    [3, 6, 7, 7],
    [3, 6, 8, 8],
    [3, 6, 9, 9],
    [3, 7, 7, 7],
    [3, 7, 8, 8],
    [3, 7, 9, 9],
    [3, 8, 8, 8],
    [3, 8, 9, 9],
    [3, 9, 9, 9],

    // 4以上の主要な不可能パターン
    [4, 4, 4, 4],
    [4, 4, 5, 5],
    [4, 4, 5, 9],
    [4, 4, 6, 6],
    [4, 4, 6, 7],
    [4, 4, 7, 7],
    [4, 4, 8, 8],
    [4, 4, 9, 9],
    [4, 5, 5, 5],
    [4, 5, 7, 7],
    [4, 5, 8, 8],
    [4, 5, 9, 9],
    [4, 6, 6, 6],
    [4, 6, 7, 7],
    [4, 6, 8, 8],
    [4, 6, 9, 9],
    [4, 7, 7, 7],
    [4, 7, 7, 9],
    [4, 7, 8, 8],
    [4, 7, 9, 9],
    [4, 8, 8, 8],
    [4, 8, 9, 9],
    [4, 9, 9, 9],
    [5, 5, 5, 5],
    [5, 5, 5, 6],
    [5, 5, 5, 7],
    [5, 5, 5, 8],
    [5, 5, 5, 9],
    [5, 5, 6, 6],
    [5, 5, 6, 7],
    [5, 5, 6, 9],
    [5, 5, 7, 7],
    [5, 5, 7, 9],
    [5, 5, 8, 8],
    [5, 5, 9, 9],
    [5, 6, 6, 6],
    [5, 6, 7, 7],
    [5, 6, 8, 8],
    [5, 6, 9, 9],
    [5, 7, 7, 7],
    [5, 7, 8, 8],
    [5, 7, 9, 9],
    [5, 8, 8, 8],
    [5, 8, 9, 9],
    [5, 9, 9, 9],
    [6, 6, 6, 6],
    [6, 6, 6, 7],
    [6, 6, 6, 8],
    [6, 6, 6, 9],
    [6, 6, 7, 7],
    [6, 6, 7, 8],
    [6, 6, 8, 8],
    [6, 6, 9, 9],
    [6, 7, 7, 7],
    [6, 7, 7, 8],
    [6, 7, 7, 9],
    [6, 7, 8, 8],
    [6, 7, 9, 9],
    [6, 8, 8, 8],
    [6, 8, 9, 9],
    [6, 9, 9, 9],
    [7, 7, 7, 7],
    [7, 7, 7, 8],
    [7, 7, 7, 9],
    [7, 7, 8, 8],
    [7, 7, 8, 9],
    [7, 7, 9, 9],
    [7, 8, 8, 8],
    [7, 8, 8, 9],
    [7, 8, 9, 9],
    [7, 9, 9, 9],
    [8, 8, 8, 8],
    [8, 8, 8, 9],
    [8, 8, 9, 9],
    [8, 9, 9, 9],
    [9, 9, 9, 9]
];

// DOM要素
const numbersContainer = document.getElementById('numbersContainer');
const answerInput = document.getElementById('answer');
const submitBtn = document.getElementById('submitBtn');
const feedbackDiv = document.getElementById('feedback');
const resetBtn = document.getElementById('resetBtn');
const prevBtn = document.getElementById('prevBtn');
const solutionBtn = document.getElementById('solutionBtn');
const newGameBtn = document.getElementById('newGameBtn');
const gradeBtn = document.getElementById('gradeBtn');
const bestTimeBtn = document.getElementById('bestTimeBtn');
const accuracySpan = document.getElementById('accuracy');
const bestTimeSpan = document.getElementById('bestTime');
const levelSelect = document.getElementById('levelSelect');
const mascotContainer = document.getElementById('mascotContainer');
const mascotCharacter = document.getElementById('mascotCharacter');
const speechBubble = document.getElementById('speechBubble');
const mascotMessage = document.getElementById('mascotMessage');

// デバッグ用：マスコット要素の確認
console.log('Mascot elements:', { mascotContainer, mascotCharacter, speechBubble, mascotMessage });

// 初期化
function init() {
    initializeProblemLists(); // 問題リストを初期化
    resetTimer(); // タイマーを初期化（一時停止状態）
    loadBestTimes(); // ベストタイムを読み込み
    generateNewNumbers();
    attachEventListeners();
    updatePlaceholder(); // 初期プレースホルダーを設定
    resetInactivityTimer(); // 居眠りタイマー開始

    // レベルカード全体をクリック可能にする
    const levelCard = document.querySelector('.level-card');
    const dropdownArrow = document.querySelector('.dropdown-arrow');

    if (levelCard && dropdownArrow) {
        // レベルカードをクリックしたらセレクトボックスを開く
        levelCard.addEventListener('click', (e) => {
            // セレクトボックス自体のクリックでない場合のみ処理
            if (e.target !== levelSelect) {
                levelSelect.focus();
                // ブラウザによってはshowPicker()が使える
                if (levelSelect.showPicker) {
                    levelSelect.showPicker();
                } else {
                    // フォールバック：クリックイベントを発火
                    const clickEvent = new MouseEvent('mousedown', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    levelSelect.dispatchEvent(clickEvent);
                }
            }
        });
    }
}

// マスコットの更新
function updateMascot(message, mood = '', duration = 3000) {
    if (!mascotMessage || !mascotCharacter || !speechBubble) return;

    mascotCharacter.textContent = '🦉'; // 🦉は固定
    mascotMessage.textContent = message;

    // 既存の表情クラスを削除
    mascotCharacter.classList.remove('mascot-joy', 'mascot-worried', 'mascot-thinking', 'mascot-sleep');

    speechBubble.classList.add('show');

    // 新しい表情クラスを追加
    if (mood) {
        mascotCharacter.classList.add(mood);
    }

    // 一定時間後に吹き出しを消し、アニメーションも停止
    if (duration > 0) {
        if (gameState.mascotTimer) clearTimeout(gameState.mascotTimer);
        gameState.mascotTimer = setTimeout(() => {
            if (!gameState.isSleeping) {
                speechBubble.classList.remove('show');
                mascotCharacter.classList.remove('mascot-joy', 'mascot-worried', 'mascot-thinking', 'mascot-sleep');
            }
        }, duration);
    } else if (duration === 0) {
        // durationが0の場合は永続表示なのでタイマーをクリア
        if (gameState.mascotTimer) clearTimeout(gameState.mascotTimer);
        // 強制的に表示状態を維持
        speechBubble.classList.add('show');
    }
}

// 居眠りタイマーのリセット
function resetInactivityTimer() {
    if (gameState.inactivityTimer) {
        clearTimeout(gameState.inactivityTimer);
    }

    // 寝ていた場合は起きる
    if (gameState.isSleeping) {
        gameState.isSleeping = false;
        const wakeMessages = ['ハッ！寝てへんで！', 'なんや、もう一回やるか？', 'シャキッとしたわ！', 'ちゃんと見てるからな！'];
        updateMascot(wakeMessages[Math.floor(Math.random() * wakeMessages.length)], 'mascot-thinking');
    }

    // 30秒操作がないと寝る
    gameState.inactivityTimer = setTimeout(startMascotSleep, 30000);
}

// マスコットをつつく反応
function handleMascotPoke(e) {
    if (e) {
        if (e.type === 'touchstart') e.preventDefault(); // touchstartの場合は伝播防止
        e.stopPropagation();
    }

    // 居眠りタイマーをリセット（つつくのは操作とみなす）
    resetInactivityTimer();

    // 居眠り中につつかれた場合
    if (gameState.isSleeping) {
        gameState.isSleeping = false;
        const wakeUpMessages = [
            'ハッ！びっくりしたやんか！',
            'なんや、今の「アレ」か！？',
            'うわぁっ！ボチボチ起きるわ...',
            '夢でタイガースが勝ってたのに...'
        ];
        updateMascot(wakeUpMessages[Math.floor(Math.random() * wakeUpMessages.length)], 'mascot-worried');
        gameState.mascotPokeCount = 0; // カウンターリセット
        return;
    }

    // 連続タップの処理
    gameState.mascotPokeCount++;
    if (gameState.pokeResetTimer) clearTimeout(gameState.pokeResetTimer);

    // 5秒間タップがないと機嫌が直る
    gameState.pokeResetTimer = setTimeout(() => {
        gameState.mascotPokeCount = 0;
    }, 5000);

    // 10の倍数以外は首を傾げるだけ（無言）
    if (gameState.mascotPokeCount % 10 !== 0) {
        if (mascotCharacter) {
            mascotCharacter.classList.remove('mascot-joy', 'mascot-worried', 'mascot-thinking', 'mascot-sleep');
            mascotCharacter.classList.add('mascot-thinking');
        }
        return;
    }

    let message = '';
    let style = 'mascot-thinking';

    if (gameState.mascotPokeCount === 10) {
        const msgs = ['なんや？', 'くすぐったいわ！', 'つつきすぎやで！', 'びっくりするやんか'];
        message = msgs[Math.floor(Math.random() * msgs.length)];
    } else if (gameState.mascotPokeCount === 20) {
        const msgs = ['しつこいなあ！', 'わかった、わかったって！', 'ええ加減にせえ！', '堪忍袋の緒が切れるわ！'];
        message = msgs[Math.floor(Math.random() * msgs.length)];
        style = 'mascot-joy';
    } else if (gameState.mascotPokeCount === 30) {
        const msgs = ['もう、怒るで！ホンマに！', 'ボチボチ堪忍してや！', '梟にも三分の理やで！', 'しつこすぎてアレやわ！'];
        message = msgs[Math.floor(Math.random() * msgs.length)];
        style = 'mascot-worried';
    } else if (gameState.mascotPokeCount === 40) {
        const msgs = ['まだやるんか！？', '執念深すぎやろ！', '指、疲れへんの？', 'もうええ加減に切り上げや！'];
        message = msgs[Math.floor(Math.random() * msgs.length)];
        style = 'mascot-worried';
    } else if (gameState.mascotPokeCount === 50) {
        const msgs = ['・・・・・・・', 'もう何も言わへんで。', '（スルー決定）', '……。'];
        message = msgs[Math.floor(Math.random() * msgs.length)];
        style = 'mascot-thinking';
    } else {
        const msgs = ['堪忍して！', 'もう、ええって！', '勘弁してえな！', 'しつこすぎるわ！'];
        message = msgs[Math.floor(Math.random() * msgs.length)];
        style = 'mascot-worried';
    }

    updateMascot(message, style);
}

// 居眠り開始
function startMascotSleep() {
    gameState.isSleeping = true;
    const sleepTalk = ['💤... スースー...', '阪神タイガース優勝や！', 'アレが決まったわ... 💤', 'たこ焼き、もう食べられへん...', 'ムニャムニャ...'];
    updateMascot(sleepTalk[Math.floor(Math.random() * sleepTalk.length)], 'mascot-sleep', 0); // 0は永続
}

// タイマー機能
function startTimer() {
    gameState.startTime = Date.now();
    gameState.timerPaused = false;
    updateTimerDisplay();

    // 1秒ごとにタイマーを更新
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    gameState.timerInterval = setInterval(updateTimerDisplay, 1000);
}

function updateTimerDisplay() {
    if (!gameState.startTime || gameState.timerPaused) {
        const timerDisplay = document.getElementById('timerDisplay');
        if (timerDisplay) {
            timerDisplay.textContent = '00:00';
        }
        return;
    }

    const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

function resetTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    gameState.startTime = null;
    gameState.timerPaused = true;
    updateTimerDisplay();
}

function resumeTimer() {
    if (gameState.timerPaused) {
        startTimer();
    }
}

// ベストタイム管理
function loadBestTimes() {
    const saved = localStorage.getItem('make24BestTimes');
    if (saved) {
        try {
            const bestTimes = JSON.parse(saved);
            // 各レベルのベストタイムを読み込み
            for (let level = 1; level <= 3; level++) {
                const record = bestTimes[level];
                if (record) {
                    // 旧形式（数値のみ）と新形式（オブジェクト）の両方に対応
                    if (typeof record === 'number') {
                        gameState.levelStats[level].bestTime = record;
                    } else if (record.time) {
                        gameState.levelStats[level].bestTime = record.time;
                    }
                }
            }
        } catch (e) {
            console.error('ベストタイムの読み込みに失敗しました', e);
        }
    }
    updateBestTimeDisplay();
}

function saveBestTime(level, timeInSeconds) {
    const saved = localStorage.getItem('make24BestTimes');
    let bestTimes = {};

    if (saved) {
        try {
            bestTimes = JSON.parse(saved);
        } catch (e) {
            console.error('ベストタイムの読み込みに失敗しました', e);
        }
    }

    bestTimes[level] = {
        time: timeInSeconds,
        date: new Date().toISOString()
    };
    localStorage.setItem('make24BestTimes', JSON.stringify(bestTimes));
    gameState.levelStats[level].bestTime = timeInSeconds;
    updateBestTimeDisplay();
}

// 新しい記録保存関数（正解数とタイムを保存）
function saveBestRecord(level, correctAnswers, totalProblems, timeInSeconds) {
    const saved = localStorage.getItem('make24BestRecords');
    let bestRecords = {};

    if (saved) {
        try {
            bestRecords = JSON.parse(saved);
        } catch (e) {
            console.error('ベストレコードの読み込みに失敗しました', e);
        }
    }

    bestRecords[level] = {
        correctAnswers: correctAnswers,
        totalProblems: totalProblems,
        time: timeInSeconds,
        date: new Date().toISOString()
    };
    localStorage.setItem('make24BestRecords', JSON.stringify(bestRecords));
    updateBestTimeDisplay();
}

function getBestRecord(level) {
    const saved = localStorage.getItem('make24BestRecords');
    if (saved) {
        try {
            const bestRecords = JSON.parse(saved);
            return bestRecords[level] || null;
        } catch (e) {
            console.error('ベストレコードの読み込みに失敗しました', e);
        }
    }
    return null;
}

function getBestTime(level) {
    const saved = localStorage.getItem('make24BestTimes');
    if (saved) {
        try {
            const bestTimes = JSON.parse(saved);
            const record = bestTimes[level];
            // 旧形式（数値のみ）と新形式（オブジェクト）の両方に対応
            if (typeof record === 'number') {
                return record;
            } else if (record && record.time) {
                return record.time;
            }
        } catch (e) {
            console.error('ベストタイムの読み込みに失敗しました', e);
        }
    }
    return null;
}

function getBestTimeDate(level) {
    const saved = localStorage.getItem('make24BestTimes');
    if (saved) {
        try {
            const bestTimes = JSON.parse(saved);
            const record = bestTimes[level];
            if (record && record.date) {
                return record.date;
            }
        } catch (e) {
            console.error('ベストタイムの読み込みに失敗しました', e);
        }
    }
    return null;
}

function updateBestTimeDisplay() {
    const record = getBestRecord(gameState.level);
    if (record) {
        bestTimeSpan.textContent = `${record.correctAnswers}問`;
    } else {
        bestTimeSpan.textContent = 'なし';
    }
}

function clearBestTime(level) {
    // 旧形式のベストタイムをクリア
    const saved = localStorage.getItem('make24BestTimes');
    let bestTimes = {};

    if (saved) {
        try {
            bestTimes = JSON.parse(saved);
        } catch (e) {
            console.error('ベストタイムの読み込みに失敗しました', e);
        }
    }

    delete bestTimes[level];
    localStorage.setItem('make24BestTimes', JSON.stringify(bestTimes));
    delete gameState.levelStats[level].bestTime;

    // 新形式のベストレコードをクリア
    const savedRecords = localStorage.getItem('make24BestRecords');
    let bestRecords = {};

    if (savedRecords) {
        try {
            bestRecords = JSON.parse(savedRecords);
        } catch (e) {
            console.error('ベストレコードの読み込みに失敗しました', e);
        }
    }

    delete bestRecords[level];
    localStorage.setItem('make24BestRecords', JSON.stringify(bestRecords));

    updateBestTimeDisplay();
}

// イベントリスナー
function attachEventListeners() {
    // ユーザー操作（全体的なクリックやキー入力）でタイマーリセット
    // ただしマスコット自身のクリック等でリセットされないよう制御
    const interactionHandler = (e) => {
        // マスコットコンテナ内の操作は無視して居眠りを継続させる
        if (e.target.closest('#mascotContainer')) return;
        resetInactivityTimer();
    };

    window.addEventListener('mousedown', interactionHandler);
    window.addEventListener('keydown', resetInactivityTimer); // キー入力は常にリセット
    window.addEventListener('touchstart', interactionHandler);

    // マスコット自身のクリックイベント
    if (mascotCharacter) {
        mascotCharacter.addEventListener('click', handleMascotPoke);
        // タッチデバイス用に追加
        mascotCharacter.addEventListener('touchstart', (e) => {
            // clickイベントと重複しないように制御
            handleMascotPoke(e);
        }, { passive: false });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            checkAnswer();
        });
    }
    answerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkAnswer();
    });
    resetBtn.addEventListener('click', resetGame);
    prevBtn.addEventListener('click', goToPreviousProblem);
    solutionBtn.addEventListener('click', showSolution);
    newGameBtn.addEventListener('click', skipToNextProblem);
    gradeBtn.addEventListener('click', showGrading);
    bestTimeBtn.addEventListener('click', showBestTimeDetails);
    levelSelect.addEventListener('change', handleLevelChange);

    // 計算機ボタンのイベントリスナー（=ボタンは除外）
    document.querySelectorAll('.calc-btn:not(#submitBtn)').forEach(btn => {
        btn.addEventListener('click', handleCalculatorButton);
    });
}

// 前の問題に戻る
function goToPreviousProblem() {
    const stats = getCurrentStats();
    const problems = levelProblems[gameState.level];

    if (stats.currentProblemIndex > 0) {
        stats.currentProblemIndex--;
    } else {
        // 最初の問題の場合、最後の問題に移動
        stats.currentProblemIndex = problems.length - 1;
    }
    generateNewNumbers();
}

// リセット機能
function resetGame() {
    // 確認ダイアログを表示
    const dialog = document.getElementById('customConfirmDialog');
    const message = document.getElementById('customConfirmMessage');
    const recordClearOption = document.getElementById('recordClearOption');
    const clearRecordCheckbox = document.getElementById('clearRecordCheckbox');

    message.textContent = 'リセットしますか？\n（第１問からやり直します）';
    recordClearOption.style.display = 'block'; // チェックボックスを表示
    clearRecordCheckbox.checked = false; // チェックを外す
    dialog.classList.add('show');

    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');

    const handleYes = () => {
        dialog.classList.remove('show');
        recordClearOption.style.display = 'none'; // チェックボックスを非表示

        // ベストタイムのクリアをチェック
        if (clearRecordCheckbox.checked) {
            clearBestTime(gameState.level);
        }

        // 現在のレベルを保持
        const currentLevel = gameState.level;

        // 全レベルの統計情報をリセット
        for (let level = 1; level <= 3; level++) {
            gameState.levelStats[level] = {
                totalAttempts: 0,
                correctAnswers: 0,
                streak: 0,
                currentProblemIndex: 0,
                shownSolutions: new Set(),
                answerHistory: {}
            };
        }

        // レベルを元に戻す
        gameState.level = currentLevel;
        gameState.solutionShown = false;
        gameState.lastButtonType = null;

        // 入力フィールドをクリア
        answerInput.value = '';

        // 数字ボタンを再度有効化
        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('disabled');
        });

        // フィードバックをクリア
        feedbackDiv.textContent = '';
        feedbackDiv.className = 'feedback';

        // タイマーをリセット
        resetTimer();

        // 表示を更新
        updateDisplay();
        generateNewNumbers();

        showFeedback('リセットしました', 'success');

        // 2秒後にメッセージを消す
        setTimeout(() => {
            feedbackDiv.textContent = '';
            feedbackDiv.className = 'feedback';
        }, 2000);

        yesBtn.removeEventListener('click', handleYes);
        noBtn.removeEventListener('click', handleNo);
    };

    const handleNo = () => {
        dialog.classList.remove('show');
        recordClearOption.style.display = 'none'; // チェックボックスを非表示
        yesBtn.removeEventListener('click', handleYes);
        noBtn.removeEventListener('click', handleNo);
    };

    yesBtn.addEventListener('click', handleYes);
    noBtn.addEventListener('click', handleNo);

    // 背景クリックで閉じる
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            handleNo();
        }
    });
}

// 次の問題にスキップ
function skipToNextProblem() {
    const stats = getCurrentStats();
    stats.currentProblemIndex++;
    generateNewNumbers();
}

// レベル変更時の処理
function handleLevelChange() {
    const newLevel = parseInt(levelSelect.value);
    // レベルは1-3の範囲に制限
    gameState.level = Math.min(Math.max(newLevel, 1), 3);
    updatePlaceholder(); // プレースホルダーを更新
    updateDisplay(); // 新しいレベルの統計を表示
    updateBestTimeDisplay(); // ベストタイムを更新
    generateNewNumbers();
}

// プレースホルダーをレベルに応じて更新
function updatePlaceholder() {
    const placeholders = {
        1: '例: 1 + 3 + 4 * 5',
        2: '例: (1 + 2) * 6 + 6',
        3: '例: 6 / (1 - 3/4)'
    };
    answerInput.placeholder = placeholders[gameState.level] || '例: 8 / (3 - 8/3)';
}

// 電卓を開く
// 計算式の最後の入力タイプを判別
function getLastInputType(inputValue) {
    if (!inputValue) return null;

    const lastChar = inputValue.trim().slice(-1);

    if (!isNaN(lastChar) && lastChar !== ' ') {
        return 'number';
    } else if (lastChar === '(') {
        return 'openParen';
    } else if (lastChar === ')') {
        return 'closeParen';
    } else if (['+', '-', '*', '/'].includes(lastChar)) {
        return 'operator';
    }

    return null;
}

// 計算機ボタンの処理
function handleCalculatorButton(e) {
    const button = e.currentTarget; // e.target から e.currentTarget に変更
    const value = button.dataset.value;
    const stats = getCurrentStats();

    // valueが未定義の場合は処理しない
    if (value === undefined) {
        return;
    }

    // 最初のボタン押下でタイマーを開始
    resumeTimer();

    // 回答済みの問題は入力できない
    if (stats.answerHistory.hasOwnProperty(stats.currentProblemIndex)) {
        showFeedback('採点するまで再挑戦できません', 'error');

        // 既存のタイマーをクリア
        if (gameState.feedbackTimer) {
            clearTimeout(gameState.feedbackTimer);
        }

        // 3秒後に元の結果を再表示（アニメーションなし）
        gameState.feedbackTimer = setTimeout(() => {
            const answer = stats.answerHistory[stats.currentProblemIndex];
            if (answer.isCorrect) {
                showFeedback(`✅ 正解済み: ${answer.formula}`, 'success', true);
            } else if (answer.showedSolution) {
                showFeedback(`解答例: ${gameState.solutions[0]}`, 'info', true);
            } else {
                showFeedback(`❌ 不正解: ${answer.formula} = ${answer.result.toFixed(2)}`, 'error', true);
            }
            gameState.feedbackTimer = null;
        }, 3000);

        return;
    }

    // 解答例を表示した問題は計算式入力ボタンを無効化
    if (gameState.solutionShown) {
        showFeedback('解答例を表示した問題は回答できません', 'error');

        // 既存のタイマーをクリア
        if (gameState.feedbackTimer) {
            clearTimeout(gameState.feedbackTimer);
        }

        // 3秒後に解答例を表示
        gameState.feedbackTimer = setTimeout(() => {
            if (gameState.solutions.length > 0) {
                showFeedback(`解答例: ${gameState.solutions[0]}`, 'info');
            }
            gameState.feedbackTimer = null;
        }, 3000);

        return;
    }

    const currentValue = answerInput.value;
    const cursorPosition = answerInput.selectionStart;

    if (value === 'clear') {
        answerInput.value = '';
        gameState.lastButtonType = null;
        // 数字ボタンを再度有効化
        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('disabled');
        });
        // 警告メッセージをクリア
        feedbackDiv.textContent = '';
        feedbackDiv.className = 'feedback';
    } else if (value === 'backspace') {
        // Backspace処理：カーソル位置の左の文字を削除
        if (cursorPosition > 0) {
            const newValue = currentValue.slice(0, cursorPosition - 1) + currentValue.slice(cursorPosition);
            answerInput.value = newValue;
            // カーソル位置を調整
            answerInput.setSelectionRange(cursorPosition - 1, cursorPosition - 1);

            // 削除した文字が数字だった場合、そのボタンを1つだけ再度有効化
            const deletedChar = currentValue[cursorPosition - 1];
            if (!isNaN(deletedChar) && deletedChar !== ' ') {
                const numberButtons = document.querySelectorAll('.number-btn');
                let enabled = false;
                for (let btn of numberButtons) {
                    if (btn.dataset.value === deletedChar && btn.disabled && !enabled) {
                        btn.disabled = false;
                        btn.classList.remove('disabled');
                        enabled = true;
                        break; // 1つだけ有効化したら終了
                    }
                }
            }

            // 削除後の計算式の最後の文字に基づいてlastButtonTypeを設定
            gameState.lastButtonType = getLastInputType(newValue);
            // エラーメッセージをクリア
            feedbackDiv.textContent = '';
            feedbackDiv.className = 'feedback';
        }
    } else if (button.classList.contains('number-btn')) {
        // 数字ボタンの場合
        if (gameState.lastButtonType === 'number') {
            // 前回も数字ボタンだった場合、警告を表示
            // 開きかっこの中かどうかをチェック
            const openCount = (currentValue.match(/\(/g) || []).length;
            const closeCount = (currentValue.match(/\)/g) || []).length;

            if (openCount > closeCount) {
                // 開きかっこの中
                showFeedback('演算子または、閉じかっこを選択してください', 'error');
            } else {
                // 開きかっこの外
                showFeedback('演算子を選択してください', 'error');
            }
            return;
        }
        if (gameState.lastButtonType === 'closeParen') {
            // 閉じ括弧の後は数字を入力できない
            showFeedback('演算子を選択してください', 'error');
            return;
        }
        if (!button.disabled) {
            answerInput.value = currentValue.slice(0, cursorPosition) + value + currentValue.slice(cursorPosition);
            // カーソル位置を調整
            answerInput.setSelectionRange(cursorPosition + value.length, cursorPosition + value.length);
            button.disabled = true;
            button.classList.add('disabled');
            gameState.lastButtonType = 'number';
            // エラーメッセージをクリア
            if (feedbackDiv.classList.contains('error')) {
                feedbackDiv.textContent = '';
                feedbackDiv.className = 'feedback';
            }
        }
    } else {
        // 演算子ボタンの場合
        // 最初に演算子を入力できないようにする（括弧は除く）
        if (currentValue === '' && value !== '(' && value !== ')') {
            showFeedback('最初に数字または開き括弧を選択してください', 'error');
            return;
        }

        // 括弧の場合
        if (value === '(' || value === ')') {
            // 開き括弧は最初または演算子の後のみ許可
            if (value === '(') {
                // 4つの数字を全て使い切った後は開き括弧を入力できない
                const usedNumbers = (currentValue.match(/[0-9]/g) || []).length;
                if (usedNumbers >= 4) {
                    showFeedback('4つの数字を全て使用済みです', 'error');
                    return;
                }

                // 開き括弧の後に開き括弧は入力できない
                if (gameState.lastButtonType === 'openParen') {
                    showFeedback('数字を選択してください', 'error');
                    return;
                }

                // 開き括弧は最初または演算子の後のみ許可
                if (currentValue !== '' && gameState.lastButtonType !== 'operator') {
                    showFeedback('演算子を選択してください', 'error');
                    return;
                }
            }

            // 閉じ括弧の場合、開き括弧が存在するかチェック
            if (value === ')') {
                const openCount = (currentValue.match(/\(/g) || []).length;
                const closeCount = (currentValue.match(/\)/g) || []).length;

                if (openCount <= closeCount) {
                    showFeedback('開き括弧が入力されていません', 'error');
                    return;
                }

                // 開き括弧の直後は閉じ括弧を入力できない
                if (gameState.lastButtonType === 'openParen') {
                    showFeedback('開き括弧の後に閉じ括弧は入力できません', 'error');
                    return;
                }

                // 演算子の直後は閉じ括弧を入力できない
                if (gameState.lastButtonType === 'operator') {
                    showFeedback('演算子の後に閉じ括弧は入力できません', 'error');
                    return;
                }
            }

            answerInput.value = currentValue.slice(0, cursorPosition) + value + currentValue.slice(cursorPosition);
            // カーソル位置を調整
            answerInput.setSelectionRange(cursorPosition + value.length, cursorPosition + value.length);
            // 開き括弧の後は数字のみ入力可能
            if (value === '(') {
                gameState.lastButtonType = 'openParen'; // 開き括弧専用の状態
            } else {
                // 閉じ括弧の後は演算子が必要
                gameState.lastButtonType = 'closeParen'; // 閉じ括弧専用の状態
            }
            // エラーメッセージをクリア
            const errorMsg = feedbackDiv.textContent;
            if (errorMsg === '演算子を選択してください' || errorMsg === '演算子または、閉じかっこを選択してください') {
                feedbackDiv.textContent = '';
                feedbackDiv.className = 'feedback';
            }
        } else {
            // 通常の演算子（+、−、×、/）の場合
            // 4つの数字を全て使い切った後は演算子を入力できない
            const usedNumbers = (currentValue.match(/[0-9]/g) || []).length;
            if (usedNumbers >= 4) {
                showFeedback('4つの数字を全て使用済みです', 'error');
                return;
            }

            // 開き括弧の直後は演算子を入力できない
            if (gameState.lastButtonType === 'openParen') {
                showFeedback('数字を選択してください', 'error');
                return;
            }
            if (gameState.lastButtonType === 'operator') {
                // 前回も演算子ボタンだった場合、警告を表示
                showFeedback('数字を選択してください', 'error');
                return;
            }
            answerInput.value = currentValue.slice(0, cursorPosition) + value + currentValue.slice(cursorPosition);
            // カーソル位置を調整
            answerInput.setSelectionRange(cursorPosition + value.length, cursorPosition + value.length);
            gameState.lastButtonType = 'operator';
            // エラーメッセージをクリア（数字連続のエラーのみ）
            const errorMsg = feedbackDiv.textContent;
            if (errorMsg === '演算子を選択してください' || errorMsg === '演算子または、閉じかっこを選択してください') {
                feedbackDiv.textContent = '';
                feedbackDiv.className = 'feedback';
            }
        }
    }

    answerInput.focus();
}

// 組み合わせが解答不可能かチェック
function isImpossibleCombination(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    return impossibleCombinations.some(impossible => {
        const sortedImpossible = [...impossible].sort((a, b) => a - b);
        return JSON.stringify(sorted) === JSON.stringify(sortedImpossible);
    });
}

// 問題をキーに変換（ソートして重複を避ける）
function getProblemKey(numbers) {
    return [...numbers].sort((a, b) => a - b).join(',');
}

// 新しい数字を生成
function generateNewNumbers() {
    // 既存のタイマーをクリア
    if (gameState.feedbackTimer) {
        clearTimeout(gameState.feedbackTimer);
        gameState.feedbackTimer = null;
    }

    const stats = getCurrentStats();
    const problems = levelProblems[gameState.level];

    // 問題リストが空の場合
    if (!problems || problems.length === 0) {
        console.error('このレベルには問題がありません');
        showFeedback('このレベルには問題がありません', 'error');
        return;
    }

    // すべての問題をクリアした場合、最初に戻る
    if (stats.currentProblemIndex >= problems.length) {
        stats.currentProblemIndex = 0;
        showFeedback('🎉 すべての問題をクリアしました！最初から再開します', 'success');
    }

    // 現在の問題を取得
    const currentProblem = problems[stats.currentProblemIndex];
    // 数字を昇順にソート
    gameState.currentNumbers = [...currentProblem.numbers].sort((a, b) => a - b);
    gameState.solutions = [currentProblem.solution];

    // この問題が解答例を表示済みかどうかをチェック
    gameState.solutionShown = stats.shownSolutions.has(stats.currentProblemIndex);

    // この問題が回答済みかどうかをチェック
    const hasAnswered = stats.answerHistory.hasOwnProperty(stats.currentProblemIndex);

    // 問題番号を更新
    updateProblemNumber();

    // マスコットの挨拶
    const greetings = ['こんちは！', 'きばっていこうや！！', '24作ったろか！', 'ボチボチいこか'];
    updateMascot(greetings[Math.floor(Math.random() * greetings.length)], 'mascot-thinking');

    displayNumbers();
    answerInput.value = '';

    // 回答済みの問題の場合、回答結果を表示（アニメーションなし）
    if (hasAnswered) {
        const answer = stats.answerHistory[stats.currentProblemIndex];
        if (answer.isCorrect) {
            showFeedback(`✅ 正解済み: ${answer.formula}`, 'success', true);
        } else if (answer.showedSolution) {
            showFeedback(`解答例: ${gameState.solutions[0]}`, 'info', true);
        } else {
            showFeedback(`❌ 不正解: ${answer.formula} = ${answer.result.toFixed(2)}`, 'error', true);
        }
    } else if (gameState.solutionShown) {
        // 解答例を表示済みの問題の場合、解答例を表示
        showFeedback(`解答例: ${gameState.solutions[0]}`, 'info', true);
    } else {
        feedbackDiv.textContent = '';
        feedbackDiv.className = 'feedback';
    }

    gameState.lastButtonType = null;
}

// 問題番号を更新
function updateProblemNumber() {
    const stats = getCurrentStats();
    const problems = levelProblems[gameState.level];
    const problemNumberSpan = document.getElementById('problemNumber');

    if (problemNumberSpan && problems) {
        const currentNum = toFullWidth(stats.currentProblemIndex + 1);
        const answeredCount = toFullWidth(Object.keys(stats.answerHistory).length);
        const totalCount = toFullWidth(problems.length);

        problemNumberSpan.textContent = `問題${currentNum}（回答済み${answeredCount}/${totalCount}）`;
    }
}

// 数字を表示
function displayNumbers() {
    // 数字カードの表示は削除されたため、計算機ボタンの更新のみ
    updateCalculatorNumbers();
}

// 計算機ボタンの数字を更新
function updateCalculatorNumbers() {
    const numberButtons = document.querySelectorAll('.number-btn');
    gameState.currentNumbers.forEach((num, index) => {
        if (numberButtons[index]) {
            numberButtons[index].textContent = num;
            numberButtons[index].dataset.value = num;
            numberButtons[index].disabled = false;
            numberButtons[index].classList.remove('disabled');
        }
    });

    // レベルに応じて演算子ボタンの表示/非表示を制御
    updateOperatorButtons();
}

// レベルに応じて演算子ボタンの表示/非表示を制御
function updateOperatorButtons() {
    const config = levelConfig[gameState.level] || levelConfig[1];
    const allowedOperators = config.operators || ['+', '-', '*', '/', '(', ')'];

    const operatorButtons = document.querySelectorAll('.operator-btn');
    operatorButtons.forEach(btn => {
        const value = btn.dataset.value;
        if (allowedOperators.includes(value)) {
            btn.style.display = '';
            btn.disabled = false;
        } else {
            btn.style.display = 'none';
        }
    });
}

// レベルに応じて使用可能な演算子かチェック
function isValidOperatorsForLevel(expression) {
    const config = levelConfig[gameState.level] || levelConfig[1];
    const allowedOperators = config.operators || ['+', '-', '*', '/', '(', ')'];

    // 式に含まれる演算子を抽出
    const usedOperators = expression.match(/[\+\-\*\/\(\)]/g) || [];

    // すべての演算子が許可されているかチェック
    for (const op of usedOperators) {
        if (!allowedOperators.includes(op)) {
            return false;
        }
    }

    return true;
}

// 答えをチェック
function checkAnswer() {
    const userAnswer = answerInput.value.trim();

    // 空の入力は無視（早期リターン）
    if (!userAnswer) {
        return;
    }

    const stats = getCurrentStats();

    // 回答済みの問題は回答できない
    if (stats.answerHistory.hasOwnProperty(stats.currentProblemIndex)) {
        showFeedback('採点するまで再挑戦できません', 'error');

        // 既存のタイマーをクリア
        if (gameState.feedbackTimer) {
            clearTimeout(gameState.feedbackTimer);
        }

        // 3秒後に元の結果を再表示（アニメーションなし）
        gameState.feedbackTimer = setTimeout(() => {
            const answer = stats.answerHistory[stats.currentProblemIndex];
            if (answer.isCorrect) {
                showFeedback(`✅ 正解済み: ${answer.formula}`, 'success', true);
            } else if (answer.showedSolution) {
                showFeedback(`解答例: ${gameState.solutions[0]}`, 'info', true);
            } else {
                showFeedback(`❌ 不正解: ${answer.formula} = ${answer.result.toFixed(2)}`, 'error', true);
            }
            gameState.feedbackTimer = null;
        }, 3000);

        return;
    }

    // 解答例を表示した問題は回答できない
    if (gameState.solutionShown) {
        showFeedback('解答例を表示した問題は回答できません', 'error');

        // 既存のタイマーをクリア
        if (gameState.feedbackTimer) {
            clearTimeout(gameState.feedbackTimer);
        }

        // 3秒後に解答例を表示
        gameState.feedbackTimer = setTimeout(() => {
            if (gameState.solutions.length > 0) {
                showFeedback(`解答例: ${gameState.solutions[0]}`, 'info');
            }
            gameState.feedbackTimer = null;
        }, 3000);

        return;
    }

    if (!userAnswer) {
        showFeedback('計算式を入力してください', 'error');
        return;
    }

    // レベルに応じた演算子のみを使用しているかチェック
    if (!isValidOperatorsForLevel(userAnswer)) {
        const config = levelConfig[gameState.level] || levelConfig[1];
        const allowedOps = config.operators.join(', ');
        showFeedback(`このレベルでは ${allowedOps} のみ使用できます`, 'error');
        return;
    }

    try {
        // 使用されている数字を抽出
        const usedNumbers = userAnswer.match(/\d+/g);
        if (!usedNumbers || usedNumbers.length !== 4) {
            showFeedback('4つの数字すべてを使ってください！', 'error');
            return;
        }

        // 数字の使用回数をチェック
        const usedNumsSorted = usedNumbers.map(Number).sort((a, b) => a - b);
        const currentNumsSorted = [...gameState.currentNumbers].sort((a, b) => a - b);

        if (JSON.stringify(usedNumsSorted) !== JSON.stringify(currentNumsSorted)) {
            showFeedback('指定された数字だけを使ってください！', 'error');
            return;
        }

        // 計算式を評価
        const result = eval(userAnswer);

        if (Math.abs(result - 24) < 0.0001) {
            handleCorrectAnswer();
        } else {
            const stats = getCurrentStats();

            // 回答履歴を保存（不正解）
            stats.answerHistory[stats.currentProblemIndex] = {
                formula: userAnswer,
                isCorrect: false,
                result: result,
                timestamp: new Date().toISOString()
            };

            stats.totalAttempts++;
            // 整数の場合は小数点以下を表示しない
            const resultText = Number.isInteger(result) ? result : result.toFixed(2);
            updateMascot('おっと！惜しいなあ。もう一回計算してみーや！', 'mascot-worried', 4000);
            showFeedback(`残念！計算結果は ${resultText} です。24を作ろう！`, 'error');
            stats.streak = 0;
            updateDisplay();
        }
    } catch (error) {
        showFeedback('無効な計算式です。もう一度試してください！', 'error');
    }
}

// 正解時の処理
function handleCorrectAnswer() {
    const stats = getCurrentStats();
    const userAnswer = answerInput.value.trim();

    // 回答履歴を保存
    stats.answerHistory[stats.currentProblemIndex] = {
        formula: userAnswer,
        isCorrect: true,
        timestamp: new Date().toISOString()
    };

    stats.streak++;
    stats.correctAnswers++;
    stats.totalAttempts++;

    updateMascot('やるやんか！正解やで！', 'mascot-joy', 5000);
    showFeedback(`🎉 正解！次の問題に進もう！`, 'success');

    updateDisplay();
}

// フィードバック表示
function showFeedback(message, type, noAnimation = false) {
    // 既存のタイマーをクリア
    if (gameState.feedbackTimer) {
        clearTimeout(gameState.feedbackTimer);
        gameState.feedbackTimer = null;
    }

    // アニメーションをリセットするために一旦クラスを削除し、リフローを強制
    feedbackDiv.className = 'feedback';
    void feedbackDiv.offsetWidth; // リフロー（再描画）を強制

    feedbackDiv.textContent = message;
    if (noAnimation) {
        // アニメーションなしで表示
        feedbackDiv.className = `feedback ${type} no-animation`;
    } else {
        // 通常のアニメーション付き表示
        feedbackDiv.className = `feedback ${type}`;
    }

    // 入力制限のエラーメッセージのみ3秒後に自動消去
    // 計算結果のエラー（不正解）は残す
    const autoHideErrors = [
        '演算子を選択してください',
        '演算子または、閉じかっこを選択してください',
        '最初に数字または開き括弧を選択してください',
        '開き括弧が入力されていません',
        '開き括弧の後に閉じ括弧は入力できません',
        '演算子の後に閉じ括弧は入力できません',
        '数字を選択してください',
        '4つの数字を全て使用済みです',
        '採点するまで再挑戦できません',
        '解答例を表示した問題は回答できません',
        '無効な計算式です。もう一度試してください！'
    ];

    if (type === 'error' && autoHideErrors.includes(message)) {
        gameState.feedbackTimer = setTimeout(() => {
            feedbackDiv.textContent = '';
            feedbackDiv.className = 'feedback';
            gameState.feedbackTimer = null;
        }, 3000);
    }
}

// 表示を更新
// 現在のレベルの統計情報を取得
function getCurrentStats() {
    return gameState.levelStats[gameState.level];
}

function updateDisplay() {
    const stats = getCurrentStats();

    // 正解率を計算
    const accuracy = stats.totalAttempts > 0
        ? Math.round((stats.correctAnswers / stats.totalAttempts) * 100)
        : 0;

    accuracySpan.textContent = accuracy + '%';
    levelSelect.value = gameState.level;
    updateProblemNumber();
}

// 解答例を表示
function showSolution() {
    // 最初のボタン押下でタイマーを開始
    resumeTimer();

    // 現在のレベルと問題インデックスを取得
    const stats = getCurrentStats();

    // 回答済みの問題の場合、解答例を表示して数秒後に元の結果に戻す
    if (stats.answerHistory.hasOwnProperty(stats.currentProblemIndex)) {
        const answer = stats.answerHistory[stats.currentProblemIndex];

        // 解答例を表示
        if (gameState.solutions.length > 0) {
            showFeedback(`解答例: ${gameState.solutions[0]}`, 'info', true);
        } else {
            showFeedback('この問題の解答例が見つかりません。24にならない可能性があります。AIに相談してみましょう', 'info', true);
        }

        // 既存のタイマーをクリア
        if (gameState.feedbackTimer) {
            clearTimeout(gameState.feedbackTimer);
        }

        // 3秒後に元の回答結果に戻す
        gameState.feedbackTimer = setTimeout(() => {
            if (answer.isCorrect) {
                showFeedback(`✅ 正解済み: ${answer.formula}`, 'success', true);
            } else if (answer.showedSolution) {
                showFeedback(`解答例: ${gameState.solutions[0]}`, 'info', true);
            } else {
                showFeedback(`❌ 不正解: ${answer.formula} = ${answer.result.toFixed(2)}`, 'error', true);
            }
            gameState.feedbackTimer = null;
        }, 3000);

        return;
    }

    // まだ解答例を表示していない問題の場合のみ試行回数を増やす
    if (!gameState.solutionShown) {
        stats.totalAttempts++;

        // 回答履歴を保存（解答例表示）
        stats.answerHistory[stats.currentProblemIndex] = {
            formula: '解答例を表示',
            isCorrect: false,
            showedSolution: true,
            timestamp: new Date().toISOString()
        };
    }

    // 解答例を表示したフラグを立てる
    gameState.solutionShown = true;
    stats.shownSolutions.add(stats.currentProblemIndex);

    updateMascot('次はイケるって！応援してるからな！', 'mascot-thinking', 5000);

    // 解答例を表示
    if (gameState.solutions.length > 0) {
        showFeedback(`解答例: ${gameState.solutions[0]}`, 'info');
    } else {
        showFeedback('この問題の解答例が見つかりません。24にならない可能性があります。AIに相談してみましょう', 'info');
    }

    // 解答例を見ると連続正解がリセットされる
    stats.streak = 0;
    updateDisplay();
}

// 採点を表示
function showGrading() {
    // カスタム確認ダイアログを表示
    const dialog = document.getElementById('customConfirmDialog');
    const message = document.getElementById('customConfirmMessage');
    message.textContent = '採点しますか？';
    dialog.classList.add('show');

    // はいボタンのイベントリスナー（一度だけ実行）
    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');

    const handleYes = () => {
        dialog.classList.remove('show');
        executeGrading();
        yesBtn.removeEventListener('click', handleYes);
        noBtn.removeEventListener('click', handleNo);
    };

    const handleNo = () => {
        dialog.classList.remove('show');
        yesBtn.removeEventListener('click', handleYes);
        noBtn.removeEventListener('click', handleNo);
    };

    yesBtn.addEventListener('click', handleYes);
    noBtn.addEventListener('click', handleNo);

    // 背景クリックで閉じる
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            handleNo();
        }
    });
}

// 採点を実行
function executeGrading() {
    const stats = getCurrentStats();
    const problems = levelProblems[gameState.level];
    const totalProblems = problems.length;
    const correctAnswers = stats.correctAnswers;
    const accuracy = totalProblems > 0 ? Math.round((correctAnswers / totalProblems) * 100) : 0;

    const levelNames = { 1: 'ふつう', 2: '難しい', 3: '鬼' };
    const levelName = levelNames[gameState.level];



    // 経過時間を計算
    let timeText = '００：００';
    let elapsedTimeInSeconds = 0;
    let isNewRecord = false;

    if (gameState.startTime && !gameState.timerPaused) {
        elapsedTimeInSeconds = Math.floor((Date.now() - gameState.startTime) / 1000);
        const minutes = Math.floor(elapsedTimeInSeconds / 60);
        const seconds = elapsedTimeInSeconds % 60;
        timeText = `${toFullWidth(String(minutes).padStart(2, '0'))}：${toFullWidth(String(seconds).padStart(2, '0'))}`;

        // ベストレコードをチェック（正解数が多い、または同じ正解数でタイムが早い）
        const currentRecord = getBestRecord(gameState.level);
        if (!currentRecord ||
            correctAnswers > currentRecord.correctAnswers ||
            (correctAnswers === currentRecord.correctAnswers && elapsedTimeInSeconds < currentRecord.time)) {
            saveBestRecord(gameState.level, correctAnswers, totalProblems, elapsedTimeInSeconds);
            isNewRecord = true;
        }
    }

    // 統計情報をリセット（現在のレベルのみ）
    stats.totalAttempts = 0;
    stats.correctAnswers = 0;
    stats.streak = 0;
    stats.currentProblemIndex = 0;
    stats.shownSolutions.clear();
    stats.answerHistory = {}; // 回答履歴もリセット

    // タイマーをリセット
    resetTimer();

    updateDisplay();
    generateNewNumbers();

    // 正解率に応じたメッセージ
    let resultMessage = '';

    // 鬼レベルの場合は正解数に応じた専用メッセージ
    if (gameState.level === 3) {
        const messages = {
            0: '👹 お前も鬼にならないか？',
            1: '💪 逃げちゃダメだ　逃げちゃダメだ\n逃げちゃダメだ',
            2: '🔥 自分で限界を決めない',
            3: '⚔️ 戦わなければ勝てない・・・',
            4: '✨ 悔いが残らない方を自分で選べ',
            5: '🏀 諦めたら、そこで試合終了ですよ',
            6: '🌟 わが生涯に一片の悔いなし'
        };
        resultMessage = messages[correctAnswers] || messages[6];
    } else if (gameState.level === 2) {
        // 難しいレベルの場合は正解数に応じた専用メッセージ
        const messages = {
            0: '💭 世の中って\nオレより頭のいい人のほうが多いんだ。',
            1: '🛤️ 「ゴールは遠いなぁ」と、\nがっかりするのも道のりです。',
            2: '📅 常に今日は明日の準備ですからね。\n今日やったことは必ず明日に返ってくるんです。',
            3: '🪜 小さいことを積み重ねるのが、\nとんでもないところへ行くただひとつの道だと思っています。',
            4: '🚀 成功の反対は失敗ではなく\n「やらないこと」',
            5: '🧠 自分がわかっていないことが\nわかるということが一番賢いんです。',
            6: '🏆 強い者が勝つのではない。\n勝った者が強いのだ。'
        };
        resultMessage = messages[correctAnswers] || messages[6];
    } else {
        // 通常レベル（ふつう）のメッセージ
        if (accuracy === 100) {
            resultMessage = '🎉 完璧です！素晴らしい！';
        } else if (accuracy >= 90) {
            resultMessage = '🌟 すごい！ほぼ完璧です！';
        } else if (accuracy >= 80) {
            resultMessage = '👏 素晴らしい成績です！';
        } else if (accuracy >= 70) {
            resultMessage = '😊 よくできました！';
        } else if (accuracy >= 60) {
            resultMessage = '💪 もう少しです！頑張りましょう！';
        } else if (accuracy >= 50) {
            resultMessage = '📚 練習を続けましょう！';
        } else if (accuracy > 0) {
            resultMessage = '🔥 次は必ずできます！';
        } else {
            resultMessage = '🏁 ここからがスタートだ！';
        }
    }

    // 採点結果をダイアログで表示
    let recordMessage = isNewRecord ? '\n🏆 記録更新！' : '';

    const message = `【採点結果　レベル：${levelName}】\n正解数　${toFullWidth(correctAnswers)}問（全${toFullWidth(totalProblems)}問）\n正解率　${toFullWidth(accuracy)}％\nタイム　${timeText}${recordMessage}\n\n${resultMessage}`;

    // ダイアログを表示
    const dialog = document.getElementById('gradingResultDialog');
    const messageP = document.getElementById('gradingResultMessage');
    const closeBtn = document.getElementById('gradingResultClose');

    messageP.innerText = message;
    dialog.classList.add('show');

    // 記録更新時の紙吹雪演出（ダイアログ表示後に呼び出す）
    if (isNewRecord) {
        // レイアウト確定のために少しだけ待つ
        setTimeout(() => {
            triggerConfetti();
        }, 100);
    }

    // 閉じるボタンのイベントリスナー
    const handleClose = () => {
        dialog.classList.remove('show');
        closeBtn.removeEventListener('click', handleClose);
    };

    closeBtn.addEventListener('click', handleClose);

    // 背景クリックで閉じる
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            handleClose();
        }
    });
}

// ベストタイム詳細を表示
function showBestTimeDetails() {
    const dialog = document.getElementById('bestTimeDialog');
    const detailsDiv = document.getElementById('bestTimeDetails');
    const closeBtn = document.getElementById('bestTimeClose');

    const levelNames = { 1: 'ふつう', 2: '難しい', 3: '鬼' };



    // 各レベルのベストレコードを表示
    let html = '';
    for (let level = 1; level <= 3; level++) {
        const levelName = levelNames[level];
        const record = getBestRecord(level);

        html += `<div class="best-time-level">`;
        html += `<h3>レベル ${toFullWidth(level)}：${levelName}</h3>`;

        if (record) {
            // スマホ表示かどうかを判定
            const isMobile = window.innerWidth <= 768;

            if (isMobile) {
                // スマホ表示：縦並び
                html += `<p>✅ 正解数：${toFullWidth(record.correctAnswers)}問 / ${toFullWidth(record.totalProblems)}問</p>`;

                const minutes = Math.floor(record.time / 60);
                const seconds = record.time % 60;
                const timeText = `${toFullWidth(String(minutes).padStart(2, '0'))}：${toFullWidth(String(seconds).padStart(2, '0'))}`;
                html += `<p>⏱️ タイム：${timeText}</p>`;
            } else {
                // PC表示：横並び
                html += `<p>✅ 正解数：${toFullWidth(record.correctAnswers)}問 / ${toFullWidth(record.totalProblems)}問　⏱️ タイム：`;

                const minutes = Math.floor(record.time / 60);
                const seconds = record.time % 60;
                const timeText = `${toFullWidth(String(minutes).padStart(2, '0'))}：${toFullWidth(String(seconds).padStart(2, '0'))}`;
                html += `${timeText}</p>`;
            }

            if (record.date) {
                const date = new Date(record.date);
                const dateText = `${toFullWidth(date.getFullYear())}年${toFullWidth(date.getMonth() + 1)}月${toFullWidth(date.getDate())}日`;
                html += `<p>📅 達成日：${dateText}</p>`;
            }
        } else {
            html += `<p class="no-record">記録なし</p>`;
        }

        html += `</div>`;
    }

    detailsDiv.innerHTML = html;
    dialog.classList.add('show');

    // 閉じるボタンのイベントリスナー
    const handleClose = () => {
        dialog.classList.remove('show');
        closeBtn.removeEventListener('click', handleClose);
    };

    closeBtn.addEventListener('click', handleClose);

    // 背景クリックで閉じる
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            handleClose();
        }
    });
}

// 問題をスキップ
function skipProblem() {
    if (gameState.solutions.length > 0) {
        showFeedback(`解答例: ${gameState.solutions[0]}`, 'info');
    } else {
        showFeedback('この問題は解くのが難しいため、新しい問題を生成します', 'info');
    }

    gameState.streak = 0;
    if (gameState.score > 10) {
        gameState.score -= 10;
    }
    updateDisplay();

    setTimeout(() => {
        generateNewNumbers();
    }, 3000);
}

// 解を見つける（簡易版）
function findSolutions(numbers) {
    const solutions = [];

    // 既知のパターンから検索
    const sortedNums = [...numbers].sort((a, b) => a - b).join(',');
    for (const pattern of knownSolutions) {
        const patternNums = [...pattern.numbers].sort((a, b) => a - b).join(',');
        if (sortedNums === patternNums) {
            solutions.push(pattern.solution);
        }
    }

    // 簡単なパターンをチェック
    const [a, b, c, d] = numbers;

    // パターン0: a + b + c + d = 24
    if (a + b + c + d === 24) solutions.push(`${a} + ${b} + ${c} + ${d}`);

    // パターン1: (a + b) * (c + d) = 24
    if ((a + b) * (c + d) === 24) solutions.push(`(${a} + ${b}) * (${c} + ${d})`);
    if ((a + c) * (b + d) === 24) solutions.push(`(${a} + ${c}) * (${b} + ${d})`);
    if ((a + d) * (b + c) === 24) solutions.push(`(${a} + ${d}) * (${b} + ${c})`);

    // パターン1-2: (a + b) * (c - d) = 24
    if ((a + b) * (c - d) === 24) solutions.push(`(${a} + ${b}) * (${c} - ${d})`);
    if ((a + b) * (d - c) === 24) solutions.push(`(${a} + ${b}) * (${d} - ${c})`);
    if ((a + c) * (b - d) === 24) solutions.push(`(${a} + ${c}) * (${b} - ${d})`);
    if ((a + c) * (d - b) === 24) solutions.push(`(${a} + ${c}) * (${d} - ${b})`);
    if ((a + d) * (b - c) === 24) solutions.push(`(${a} + ${d}) * (${b} - ${c})`);
    if ((a + d) * (c - b) === 24) solutions.push(`(${a} + ${d}) * (${c} - ${b})`);
    if ((b + c) * (a - d) === 24) solutions.push(`(${b} + ${c}) * (${a} - ${d})`);
    if ((b + c) * (d - a) === 24) solutions.push(`(${b} + ${c}) * (${d} - ${a})`);
    if ((b + d) * (a - c) === 24) solutions.push(`(${b} + ${d}) * (${a} - ${c})`);
    if ((b + d) * (c - a) === 24) solutions.push(`(${b} + ${d}) * (${c} - ${a})`);
    if ((c + d) * (a - b) === 24) solutions.push(`(${c} + ${d}) * (${a} - ${b})`);
    if ((c + d) * (b - a) === 24) solutions.push(`(${c} + ${d}) * (${b} - ${a})`);

    // パターン2: (a - b) * (c + d) = 24
    if ((a - b) * (c + d) === 24) solutions.push(`(${a} - ${b}) * (${c} + ${d})`);

    // パターン2-1: (a - b) * (c - d) = 24
    if ((a - b) * (c - d) === 24) solutions.push(`(${a} - ${b}) * (${c} - ${d})`);
    if ((a - b) * (d - c) === 24) solutions.push(`(${a} - ${b}) * (${d} - ${c})`);
    if ((b - a) * (c - d) === 24) solutions.push(`(${b} - ${a}) * (${c} - ${d})`);
    if ((b - a) * (d - c) === 24) solutions.push(`(${b} - ${a}) * (${d} - ${c})`);
    if ((a - c) * (b - d) === 24) solutions.push(`(${a} - ${c}) * (${b} - ${d})`);
    if ((a - c) * (d - b) === 24) solutions.push(`(${a} - ${c}) * (${d} - ${b})`);
    if ((c - a) * (b - d) === 24) solutions.push(`(${c} - ${a}) * (${b} - ${d})`);
    if ((c - a) * (d - b) === 24) solutions.push(`(${c} - ${a}) * (${d} - ${b})`);
    if ((a - d) * (b - c) === 24) solutions.push(`(${a} - ${d}) * (${b} - ${c})`);
    if ((a - d) * (c - b) === 24) solutions.push(`(${a} - ${d}) * (${c} - ${b})`);
    if ((d - a) * (b - c) === 24) solutions.push(`(${d} - ${a}) * (${b} - ${c})`);
    if ((d - a) * (c - b) === 24) solutions.push(`(${d} - ${a}) * (${c} - ${b})`);

    // パターン2-2: (a * b) - (c + d) = 24
    if (a * b - (c + d) === 24) solutions.push(`(${a} * ${b}) - (${c} + ${d})`);
    if (a * c - (b + d) === 24) solutions.push(`(${a} * ${c}) - (${b} + ${d})`);
    if (a * d - (b + c) === 24) solutions.push(`(${a} * ${d}) - (${b} + ${c})`);
    if (b * c - (a + d) === 24) solutions.push(`(${b} * ${c}) - (${a} + ${d})`);
    if (b * d - (a + c) === 24) solutions.push(`(${b} * ${d}) - (${a} + ${c})`);
    if (c * d - (a + b) === 24) solutions.push(`(${c} * ${d}) - (${a} + ${b})`);

    // パターン3: a * b + c * d = 24
    if (a * b + c * d === 24) solutions.push(`${a} * ${b} + ${c} * ${d}`);
    if (a * c + b * d === 24) solutions.push(`${a} * ${c} + ${b} * ${d}`);
    if (a * d + b * c === 24) solutions.push(`${a} * ${d} + ${b} * ${c}`);

    // パターン3-1: a * b - c * d = 24
    if (a * b - c * d === 24) solutions.push(`${a} * ${b} - ${c} * ${d}`);
    if (a * c - b * d === 24) solutions.push(`${a} * ${c} - ${b} * ${d}`);
    if (a * d - b * c === 24) solutions.push(`${a} * ${d} - ${b} * ${c}`);
    if (b * c - a * d === 24) solutions.push(`${b} * ${c} - ${a} * ${d}`);
    if (b * d - a * c === 24) solutions.push(`${b} * ${d} - ${a} * ${c}`);
    if (c * d - a * b === 24) solutions.push(`${c} * ${d} - ${a} * ${b}`);

    // パターン3-2: a * b + c - d = 24
    if (a * b + c - d === 24) solutions.push(`${a} * ${b} + ${c} - ${d}`);
    if (a * b + d - c === 24) solutions.push(`${a} * ${b} + ${d} - ${c}`);
    if (a * c + b - d === 24) solutions.push(`${a} * ${c} + ${b} - ${d}`);
    if (a * c + d - b === 24) solutions.push(`${a} * ${c} + ${d} - ${b}`);
    if (a * d + b - c === 24) solutions.push(`${a} * ${d} + ${b} - ${c}`);
    if (a * d + c - b === 24) solutions.push(`${a} * ${d} + ${c} - ${b}`);
    if (b * c + a - d === 24) solutions.push(`${b} * ${c} + ${a} - ${d}`);
    if (b * c + d - a === 24) solutions.push(`${b} * ${c} + ${d} - ${a}`);
    if (b * d + a - c === 24) solutions.push(`${b} * ${d} + ${a} - ${c}`);
    if (b * d + c - a === 24) solutions.push(`${b} * ${d} + ${c} - ${a}`);
    if (c * d + a - b === 24) solutions.push(`${c} * ${d} + ${a} - ${b}`);
    if (c * d + b - a === 24) solutions.push(`${c} * ${d} + ${b} - ${a}`);

    // パターン4: a * b * c - d = 24
    if (a * b * c - d === 24) solutions.push(`${a} * ${b} * ${c} - ${d}`);
    if (a * b * d - c === 24) solutions.push(`${a} * ${b} * ${d} - ${c}`);
    if (a * c * d - b === 24) solutions.push(`${a} * ${c} * ${d} - ${b}`);
    if (b * c * d - a === 24) solutions.push(`${b} * ${c} * ${d} - ${a}`);

    // パターン4-2: (a - b) * c * d = 24
    if ((a - b) * c * d === 24) solutions.push(`(${a} - ${b}) * ${c} * ${d}`);
    if ((b - a) * c * d === 24) solutions.push(`(${b} - ${a}) * ${c} * ${d}`);
    if ((a - c) * b * d === 24) solutions.push(`(${a} - ${c}) * ${b} * ${d}`);
    if ((c - a) * b * d === 24) solutions.push(`(${c} - ${a}) * ${b} * ${d}`);
    if ((a - d) * b * c === 24) solutions.push(`(${a} - ${d}) * ${b} * ${c}`);
    if ((d - a) * b * c === 24) solutions.push(`(${d} - ${a}) * ${b} * ${c}`);
    if ((b - c) * a * d === 24) solutions.push(`(${b} - ${c}) * ${a} * ${d}`);
    if ((c - b) * a * d === 24) solutions.push(`(${c} - ${b}) * ${a} * ${d}`);
    if ((b - d) * a * c === 24) solutions.push(`(${b} - ${d}) * ${a} * ${c}`);
    if ((d - b) * a * c === 24) solutions.push(`(${d} - ${b}) * ${a} * ${c}`);
    if ((c - d) * a * b === 24) solutions.push(`(${c} - ${d}) * ${a} * ${b}`);
    if ((d - c) * a * b === 24) solutions.push(`(${d} - ${c}) * ${a} * ${b}`);

    // パターン5: (a + b + c) * d = 24
    if ((a + b + c) * d === 24) solutions.push(`(${a} + ${b} + ${c}) * ${d}`);
    if ((a + b + d) * c === 24) solutions.push(`(${a} + ${b} + ${d}) * ${c}`);
    if ((a + c + d) * b === 24) solutions.push(`(${a} + ${c} + ${d}) * ${b}`);
    if ((b + c + d) * a === 24) solutions.push(`(${b} + ${c} + ${d}) * ${a}`);

    // パターン5-2: (a - b + c) * d = 24
    if ((a - b + c) * d === 24) solutions.push(`(${a} - ${b} + ${c}) * ${d}`);
    if ((a - b + d) * c === 24) solutions.push(`(${a} - ${b} + ${d}) * ${c}`);
    if ((a - c + b) * d === 24) solutions.push(`(${a} - ${c} + ${b}) * ${d}`);
    if ((a - c + d) * b === 24) solutions.push(`(${a} - ${c} + ${d}) * ${b}`);
    if ((a - d + b) * c === 24) solutions.push(`(${a} - ${d} + ${b}) * ${c}`);
    if ((a - d + c) * b === 24) solutions.push(`(${a} - ${d} + ${c}) * ${b}`);
    if ((b - a + c) * d === 24) solutions.push(`(${b} - ${a} + ${c}) * ${d}`);
    if ((b - a + d) * c === 24) solutions.push(`(${b} - ${a} + ${d}) * ${c}`);
    if ((b - c + a) * d === 24) solutions.push(`(${b} - ${c} + ${a}) * ${d}`);
    if ((b - c + d) * a === 24) solutions.push(`(${b} - ${c} + ${d}) * ${a}`);
    if ((b - d + a) * c === 24) solutions.push(`(${b} - ${d} + ${a}) * ${c}`);
    if ((b - d + c) * a === 24) solutions.push(`(${b} - ${d} + ${c}) * ${a}`);
    if ((c - a + b) * d === 24) solutions.push(`(${c} - ${a} + ${b}) * ${d}`);
    if ((c - a + d) * b === 24) solutions.push(`(${c} - ${a} + ${d}) * ${b}`);
    if ((c - b + a) * d === 24) solutions.push(`(${c} - ${b} + ${a}) * ${d}`);
    if ((c - b + d) * a === 24) solutions.push(`(${c} - ${b} + ${d}) * ${a}`);
    if ((c - d + a) * b === 24) solutions.push(`(${c} - ${d} + ${a}) * ${b}`);
    if ((c - d + b) * a === 24) solutions.push(`(${c} - ${d} + ${b}) * ${a}`);
    if ((d - a + b) * c === 24) solutions.push(`(${d} - ${a} + ${b}) * ${c}`);
    if ((d - a + c) * b === 24) solutions.push(`(${d} - ${a} + ${c}) * ${b}`);
    if ((d - b + a) * c === 24) solutions.push(`(${d} - ${b} + ${a}) * ${c}`);
    if ((d - b + c) * a === 24) solutions.push(`(${d} - ${b} + ${c}) * ${a}`);
    if ((d - c + a) * b === 24) solutions.push(`(${d} - ${c} + ${a}) * ${b}`);
    if ((d - c + b) * a === 24) solutions.push(`(${d} - ${c} + ${b}) * ${a}`);

    // パターン6: a + b + c - d = 24
    if (a + b + c - d === 24) solutions.push(`${a} + ${b} + ${c} - ${d}`);
    if (a + b + d - c === 24) solutions.push(`${a} + ${b} + ${d} - ${c}`);
    if (a + c + d - b === 24) solutions.push(`${a} + ${c} + ${d} - ${b}`);
    if (b + c + d - a === 24) solutions.push(`${b} + ${c} + ${d} - ${a}`);

    // パターン7: (a + b) / c * d = 24
    if (c !== 0 && (a + b) / c * d === 24) solutions.push(`(${a} + ${b}) / ${c} * ${d}`);
    if (c !== 0 && (a + d) / c * b === 24) solutions.push(`(${a} + ${d}) / ${c} * ${b}`);
    if (c !== 0 && (b + d) / c * a === 24) solutions.push(`(${b} + ${d}) / ${c} * ${a}`);
    if (d !== 0 && (a + b) / d * c === 24) solutions.push(`(${a} + ${b}) / ${d} * ${c}`);
    if (d !== 0 && (a + c) / d * b === 24) solutions.push(`(${a} + ${c}) / ${d} * ${b}`);
    if (d !== 0 && (b + c) / d * a === 24) solutions.push(`(${b} + ${c}) / ${d} * ${a}`);
    if (b !== 0 && (a + c) / b * d === 24) solutions.push(`(${a} + ${c}) / ${b} * ${d}`);
    if (b !== 0 && (a + d) / b * c === 24) solutions.push(`(${a} + ${d}) / ${b} * ${c}`);
    if (b !== 0 && (c + d) / b * a === 24) solutions.push(`(${c} + ${d}) / ${b} * ${a}`);
    if (a !== 0 && (b + c) / a * d === 24) solutions.push(`(${b} + ${c}) / ${a} * ${d}`);
    if (a !== 0 && (b + d) / a * c === 24) solutions.push(`(${b} + ${d}) / ${a} * ${c}`);
    if (a !== 0 && (c + d) / a * b === 24) solutions.push(`(${c} + ${d}) / ${a} * ${b}`);

    // パターン8: a * b / c * d = 24
    if (c !== 0 && a * b / c * d === 24) solutions.push(`${a} * ${b} / ${c} * ${d}`);
    if (c !== 0 && a * d / c * b === 24) solutions.push(`${a} * ${d} / ${c} * ${b}`);
    if (c !== 0 && b * d / c * a === 24) solutions.push(`${b} * ${d} / ${c} * ${a}`);
    if (d !== 0 && a * b / d * c === 24) solutions.push(`${a} * ${b} / ${d} * ${c}`);
    if (d !== 0 && a * c / d * b === 24) solutions.push(`${a} * ${c} / ${d} * ${b}`);
    if (d !== 0 && b * c / d * a === 24) solutions.push(`${b} * ${c} / ${d} * ${a}`);
    if (b !== 0 && a * c / b * d === 24) solutions.push(`${a} * ${c} / ${b} * ${d}`);
    if (b !== 0 && a * d / b * c === 24) solutions.push(`${a} * ${d} / ${b} * ${c}`);
    if (b !== 0 && c * d / b * a === 24) solutions.push(`${c} * ${d} / ${b} * ${a}`);
    if (a !== 0 && b * c / a * d === 24) solutions.push(`${b} * ${c} / ${a} * ${d}`);
    if (a !== 0 && b * d / a * c === 24) solutions.push(`${b} * ${d} / ${a} * ${c}`);
    if (a !== 0 && c * d / a * b === 24) solutions.push(`${c} * ${d} / ${a} * ${b}`);

    // パターン9: (a * b - c) * d = 24
    if ((a * b - c) * d === 24) solutions.push(`(${a} * ${b} - ${c}) * ${d}`);
    if ((a * b - d) * c === 24) solutions.push(`(${a} * ${b} - ${d}) * ${c}`);
    if ((a * c - b) * d === 24) solutions.push(`(${a} * ${c} - ${b}) * ${d}`);
    if ((a * c - d) * b === 24) solutions.push(`(${a} * ${c} - ${d}) * ${b}`);
    if ((a * d - b) * c === 24) solutions.push(`(${a} * ${d} - ${b}) * ${c}`);
    if ((a * d - c) * b === 24) solutions.push(`(${a} * ${d} - ${c}) * ${b}`);
    if ((b * c - a) * d === 24) solutions.push(`(${b} * ${c} - ${a}) * ${d}`);
    if ((b * c - d) * a === 24) solutions.push(`(${b} * ${c} - ${d}) * ${a}`);
    if ((b * d - a) * c === 24) solutions.push(`(${b} * ${d} - ${a}) * ${c}`);
    if ((b * d - c) * a === 24) solutions.push(`(${b} * ${d} - ${c}) * ${a}`);
    if ((c * d - a) * b === 24) solutions.push(`(${c} * ${d} - ${a}) * ${b}`);
    if ((c * d - b) * a === 24) solutions.push(`(${c} * ${d} - ${b}) * ${a}`);

    // パターン10: (a + b) * c * d = 24
    if ((a + b) * c * d === 24) solutions.push(`(${a} + ${b}) * ${c} * ${d}`);
    if ((a + c) * b * d === 24) solutions.push(`(${a} + ${c}) * ${b} * ${d}`);
    if ((a + d) * b * c === 24) solutions.push(`(${a} + ${d}) * ${b} * ${c}`);
    if ((b + c) * a * d === 24) solutions.push(`(${b} + ${c}) * ${a} * ${d}`);
    if ((b + d) * a * c === 24) solutions.push(`(${b} + ${d}) * ${a} * ${c}`);
    if ((c + d) * a * b === 24) solutions.push(`(${c} + ${d}) * ${a} * ${b}`);

    // パターン11: a + b * c / d = 24
    if (d !== 0 && a + b * c / d === 24) solutions.push(`${a} + ${b} * ${c} / ${d}`);
    if (d !== 0 && b + a * c / d === 24) solutions.push(`${b} + ${a} * ${c} / ${d}`);
    if (d !== 0 && c + a * b / d === 24) solutions.push(`${c} + ${a} * ${b} / ${d}`);
    if (c !== 0 && a + b * d / c === 24) solutions.push(`${a} + ${b} * ${d} / ${c}`);
    if (c !== 0 && b + a * d / c === 24) solutions.push(`${b} + ${a} * ${d} / ${c}`);
    if (c !== 0 && d + a * b / c === 24) solutions.push(`${d} + ${a} * ${b} / ${c}`);
    if (b !== 0 && a + c * d / b === 24) solutions.push(`${a} + ${c} * ${d} / ${b}`);
    if (b !== 0 && c + a * d / b === 24) solutions.push(`${c} + ${a} * ${d} / ${b}`);
    if (b !== 0 && d + a * c / b === 24) solutions.push(`${d} + ${a} * ${c} / ${b}`);
    if (a !== 0 && b + c * d / a === 24) solutions.push(`${b} + ${c} * ${d} / ${a}`);
    if (a !== 0 && c + b * d / a === 24) solutions.push(`${c} + ${b} * ${d} / ${a}`);
    if (a !== 0 && d + b * c / a === 24) solutions.push(`${d} + ${b} * ${c} / ${a}`);

    // パターン12: (a - b) * c + d = 24
    if ((a - b) * c + d === 24) solutions.push(`(${a} - ${b}) * ${c} + ${d}`);
    if ((a - b) * d + c === 24) solutions.push(`(${a} - ${b}) * ${d} + ${c}`);
    if ((a - c) * b + d === 24) solutions.push(`(${a} - ${c}) * ${b} + ${d}`);
    if ((a - c) * d + b === 24) solutions.push(`(${a} - ${c}) * ${d} + ${b}`);
    if ((a - d) * b + c === 24) solutions.push(`(${a} - ${d}) * ${b} + ${c}`);
    if ((a - d) * c + b === 24) solutions.push(`(${a} - ${d}) * ${c} + ${b}`);
    if ((b - a) * c + d === 24) solutions.push(`(${b} - ${a}) * ${c} + ${d}`);
    if ((b - a) * d + c === 24) solutions.push(`(${b} - ${a}) * ${d} + ${c}`);
    if ((b - c) * a + d === 24) solutions.push(`(${b} - ${c}) * ${a} + ${d}`);
    if ((b - c) * d + a === 24) solutions.push(`(${b} - ${c}) * ${d} + ${a}`);
    if ((b - d) * a + c === 24) solutions.push(`(${b} - ${d}) * ${a} + ${c}`);
    if ((b - d) * c + a === 24) solutions.push(`(${b} - ${d}) * ${c} + ${a}`);
    if ((c - a) * b + d === 24) solutions.push(`(${c} - ${a}) * ${b} + ${d}`);
    if ((c - a) * d + b === 24) solutions.push(`(${c} - ${a}) * ${d} + ${b}`);
    if ((c - b) * a + d === 24) solutions.push(`(${c} - ${b}) * ${a} + ${d}`);
    if ((c - b) * d + a === 24) solutions.push(`(${c} - ${b}) * ${d} + ${a}`);
    if ((c - d) * a + b === 24) solutions.push(`(${c} - ${d}) * ${a} + ${b}`);
    if ((c - d) * b + a === 24) solutions.push(`(${c} - ${d}) * ${b} + ${a}`);
    if ((d - a) * b + c === 24) solutions.push(`(${d} - ${a}) * ${b} + ${c}`);
    if ((d - a) * c + b === 24) solutions.push(`(${d} - ${a}) * ${c} + ${b}`);
    if ((d - b) * a + c === 24) solutions.push(`(${d} - ${b}) * ${a} + ${c}`);
    if ((d - b) * c + a === 24) solutions.push(`(${d} - ${b}) * ${c} + ${a}`);
    if ((d - c) * a + b === 24) solutions.push(`(${d} - ${c}) * ${a} + ${b}`);
    if ((d - c) * b + a === 24) solutions.push(`(${d} - ${c}) * ${b} + ${a}`);

    // パターン13: a / (b / c - d) = 24
    if (c !== 0 && b / c - d !== 0 && a / (b / c - d) === 24) solutions.push(`${a} / (${b} / ${c} - ${d})`);
    if (c !== 0 && b / c - a !== 0 && d / (b / c - a) === 24) solutions.push(`${d} / (${b} / ${c} - ${a})`);
    if (c !== 0 && d / c - b !== 0 && a / (d / c - b) === 24) solutions.push(`${a} / (${d} / ${c} - ${b})`);
    if (c !== 0 && d / c - a !== 0 && b / (d / c - a) === 24) solutions.push(`${b} / (${d} / ${c} - ${a})`);
    if (c !== 0 && a / c - d !== 0 && b / (a / c - d) === 24) solutions.push(`${b} / (${a} / ${c} - ${d})`);
    if (c !== 0 && a / c - b !== 0 && d / (a / c - b) === 24) solutions.push(`${d} / (${a} / ${c} - ${b})`);
    if (d !== 0 && b / d - c !== 0 && a / (b / d - c) === 24) solutions.push(`${a} / (${b} / ${d} - ${c})`);
    if (d !== 0 && b / d - a !== 0 && c / (b / d - a) === 24) solutions.push(`${c} / (${b} / ${d} - ${a})`);
    if (d !== 0 && c / d - b !== 0 && a / (c / d - b) === 24) solutions.push(`${a} / (${c} / ${d} - ${b})`);
    if (d !== 0 && c / d - a !== 0 && b / (c / d - a) === 24) solutions.push(`${b} / (${c} / ${d} - ${a})`);
    if (d !== 0 && a / d - c !== 0 && b / (a / d - c) === 24) solutions.push(`${b} / (${a} / ${d} - ${c})`);
    if (d !== 0 && a / d - b !== 0 && c / (a / d - b) === 24) solutions.push(`${c} / (${a} / ${d} - ${b})`);
    if (b !== 0 && c / b - d !== 0 && a / (c / b - d) === 24) solutions.push(`${a} / (${c} / ${b} - ${d})`);
    if (b !== 0 && c / b - a !== 0 && d / (c / b - a) === 24) solutions.push(`${d} / (${c} / ${b} - ${a})`);
    if (b !== 0 && d / b - c !== 0 && a / (d / b - c) === 24) solutions.push(`${a} / (${d} / ${b} - ${c})`);
    if (b !== 0 && d / b - a !== 0 && c / (d / b - a) === 24) solutions.push(`${c} / (${d} / ${b} - ${a})`);
    if (b !== 0 && a / b - d !== 0 && c / (a / b - d) === 24) solutions.push(`${c} / (${a} / ${b} - ${d})`);
    if (b !== 0 && a / b - c !== 0 && d / (a / b - c) === 24) solutions.push(`${d} / (${a} / ${b} - ${c})`);
    if (a !== 0 && c / a - d !== 0 && b / (c / a - d) === 24) solutions.push(`${b} / (${c} / ${a} - ${d})`);
    if (a !== 0 && c / a - b !== 0 && d / (c / a - b) === 24) solutions.push(`${d} / (${c} / ${a} - ${b})`);
    if (a !== 0 && d / a - c !== 0 && b / (d / a - c) === 24) solutions.push(`${b} / (${d} / ${a} - ${c})`);
    if (a !== 0 && d / a - b !== 0 && c / (d / a - b) === 24) solutions.push(`${c} / (${d} / ${a} - ${b})`);
    if (a !== 0 && b / a - d !== 0 && c / (b / a - d) === 24) solutions.push(`${c} / (${b} / ${a} - ${d})`);
    if (a !== 0 && b / a - c !== 0 && d / (b / a - c) === 24) solutions.push(`${d} / (${b} / ${a} - ${c})`);

    // パターン14: a * (b + c - d) = 24
    if (a * (b + c - d) === 24) solutions.push(`${a} * (${b} + ${c} - ${d})`);
    if (a * (b + d - c) === 24) solutions.push(`${a} * (${b} + ${d} - ${c})`);
    if (a * (c + d - b) === 24) solutions.push(`${a} * (${c} + ${d} - ${b})`);
    if (b * (a + c - d) === 24) solutions.push(`${b} * (${a} + ${c} - ${d})`);
    if (b * (a + d - c) === 24) solutions.push(`${b} * (${a} + ${d} - ${c})`);
    if (b * (c + d - a) === 24) solutions.push(`${b} * (${c} + ${d} - ${a})`);
    if (c * (a + b - d) === 24) solutions.push(`${c} * (${a} + ${b} - ${d})`);
    if (c * (a + d - b) === 24) solutions.push(`${c} * (${a} + ${d} - ${b})`);
    if (c * (b + d - a) === 24) solutions.push(`${c} * (${b} + ${d} - ${a})`);
    if (d * (a + b - c) === 24) solutions.push(`${d} * (${a} + ${b} - ${c})`);
    if (d * (a + c - b) === 24) solutions.push(`${d} * (${a} + ${c} - ${b})`);
    if (d * (b + c - a) === 24) solutions.push(`${d} * (${b} + ${c} - ${a})`);

    // パターン15: a * (b + c + d) = 24
    if (a * (b + c + d) === 24) solutions.push(`${a} * (${b} + ${c} + ${d})`);
    if (b * (a + c + d) === 24) solutions.push(`${b} * (${a} + ${c} + ${d})`);
    if (c * (a + b + d) === 24) solutions.push(`${c} * (${a} + ${b} + ${d})`);
    if (d * (a + b + c) === 24) solutions.push(`${d} * (${a} + ${b} + ${c})`);

    // パターン16: a * (b - c / d) = 24
    if (d !== 0 && a * (b - c / d) === 24) solutions.push(`${a} * (${b} - ${c} / ${d})`);
    if (d !== 0 && a * (c - b / d) === 24) solutions.push(`${a} * (${c} - ${b} / ${d})`);
    if (d !== 0 && b * (a - c / d) === 24) solutions.push(`${b} * (${a} - ${c} / ${d})`);
    if (d !== 0 && b * (c - a / d) === 24) solutions.push(`${b} * (${c} - ${a} / ${d})`);
    if (d !== 0 && c * (a - b / d) === 24) solutions.push(`${c} * (${a} - ${b} / ${d})`);
    if (d !== 0 && c * (b - a / d) === 24) solutions.push(`${c} * (${b} - ${a} / ${d})`);
    if (c !== 0 && a * (b - d / c) === 24) solutions.push(`${a} * (${b} - ${d} / ${c})`);
    if (c !== 0 && a * (d - b / c) === 24) solutions.push(`${a} * (${d} - ${b} / ${c})`);
    if (c !== 0 && b * (a - d / c) === 24) solutions.push(`${b} * (${a} - ${d} / ${c})`);
    if (c !== 0 && b * (d - a / c) === 24) solutions.push(`${b} * (${d} - ${a} / ${c})`);
    if (c !== 0 && d * (a - b / c) === 24) solutions.push(`${d} * (${a} - ${b} / ${c})`);
    if (c !== 0 && d * (b - a / c) === 24) solutions.push(`${d} * (${b} - ${a} / ${c})`);
    if (b !== 0 && a * (c - d / b) === 24) solutions.push(`${a} * (${c} - ${d} / ${b})`);
    if (b !== 0 && a * (d - c / b) === 24) solutions.push(`${a} * (${d} - ${c} / ${b})`);
    if (b !== 0 && c * (a - d / b) === 24) solutions.push(`${c} * (${a} - ${d} / ${b})`);
    if (b !== 0 && c * (d - a / b) === 24) solutions.push(`${c} * (${d} - ${a} / ${b})`);
    if (b !== 0 && d * (a - c / b) === 24) solutions.push(`${d} * (${a} - ${c} / ${b})`);
    if (b !== 0 && d * (c - a / b) === 24) solutions.push(`${d} * (${c} - ${a} / ${b})`);
    if (a !== 0 && b * (c - d / a) === 24) solutions.push(`${b} * (${c} - ${d} / ${a})`);
    if (a !== 0 && b * (d - c / a) === 24) solutions.push(`${b} * (${d} - ${c} / ${a})`);
    if (a !== 0 && c * (b - d / a) === 24) solutions.push(`${c} * (${b} - ${d} / ${a})`);
    if (a !== 0 && c * (d - b / a) === 24) solutions.push(`${c} * (${d} - ${b} / ${a})`);
    if (a !== 0 && d * (b - c / a) === 24) solutions.push(`${d} * (${b} - ${c} / ${a})`);
    if (a !== 0 && d * (c - b / a) === 24) solutions.push(`${d} * (${c} - ${b} / ${a})`);

    // パターン16-2: a * (b - c - d) = 24
    if (a * (b - c - d) === 24) solutions.push(`${a} * (${b} - ${c} - ${d})`);
    if (a * (b - d - c) === 24) solutions.push(`${a} * (${b} - ${d} - ${c})`);
    if (a * (c - b - d) === 24) solutions.push(`${a} * (${c} - ${b} - ${d})`);
    if (a * (c - d - b) === 24) solutions.push(`${a} * (${c} - ${d} - ${b})`);
    if (a * (d - b - c) === 24) solutions.push(`${a} * (${d} - ${b} - ${c})`);
    if (a * (d - c - b) === 24) solutions.push(`${a} * (${d} - ${c} - ${b})`);
    if (b * (a - c - d) === 24) solutions.push(`${b} * (${a} - ${c} - ${d})`);
    if (b * (a - d - c) === 24) solutions.push(`${b} * (${a} - ${d} - ${c})`);
    if (b * (c - a - d) === 24) solutions.push(`${b} * (${c} - ${a} - ${d})`);
    if (b * (c - d - a) === 24) solutions.push(`${b} * (${c} - ${d} - ${a})`);
    if (b * (d - a - c) === 24) solutions.push(`${b} * (${d} - ${a} - ${c})`);
    if (b * (d - c - a) === 24) solutions.push(`${b} * (${d} - ${c} - ${a})`);
    if (c * (a - b - d) === 24) solutions.push(`${c} * (${a} - ${b} - ${d})`);
    if (c * (a - d - b) === 24) solutions.push(`${c} * (${a} - ${d} - ${b})`);
    if (c * (b - a - d) === 24) solutions.push(`${c} * (${b} - ${a} - ${d})`);
    if (c * (b - d - a) === 24) solutions.push(`${c} * (${b} - ${d} - ${a})`);
    if (c * (d - a - b) === 24) solutions.push(`${c} * (${d} - ${a} - ${b})`);
    if (c * (d - b - a) === 24) solutions.push(`${c} * (${d} - ${b} - ${a})`);
    if (d * (a - b - c) === 24) solutions.push(`${d} * (${a} - ${b} - ${c})`);
    if (d * (a - c - b) === 24) solutions.push(`${d} * (${a} - ${c} - ${b})`);
    if (d * (b - a - c) === 24) solutions.push(`${d} * (${b} - ${a} - ${c})`);
    if (d * (b - c - a) === 24) solutions.push(`${d} * (${b} - ${c} - ${a})`);
    if (d * (c - a - b) === 24) solutions.push(`${d} * (${c} - ${a} - ${b})`);
    if (d * (c - b - a) === 24) solutions.push(`${d} * (${c} - ${b} - ${a})`);

    // パターン17: a * (b + c) - d = 24
    if (a * (b + c) - d === 24) solutions.push(`${a} * (${b} + ${c}) - ${d}`);
    if (a * (b + d) - c === 24) solutions.push(`${a} * (${b} + ${d}) - ${c}`);
    if (a * (c + d) - b === 24) solutions.push(`${a} * (${c} + ${d}) - ${b}`);
    if (b * (a + c) - d === 24) solutions.push(`${b} * (${a} + ${c}) - ${d}`);
    if (b * (a + d) - c === 24) solutions.push(`${b} * (${a} + ${d}) - ${c}`);
    if (b * (c + d) - a === 24) solutions.push(`${b} * (${c} + ${d}) - ${a}`);
    if (c * (a + b) - d === 24) solutions.push(`${c} * (${a} + ${b}) - ${d}`);
    if (c * (a + d) - b === 24) solutions.push(`${c} * (${a} + ${d}) - ${b}`);
    if (c * (b + d) - a === 24) solutions.push(`${c} * (${b} + ${d}) - ${a}`);
    if (d * (a + b) - c === 24) solutions.push(`${d} * (${a} + ${b}) - ${c}`);
    if (d * (a + c) - b === 24) solutions.push(`${d} * (${a} + ${c}) - ${b}`);
    if (d * (b + c) - a === 24) solutions.push(`${d} * (${b} + ${c}) - ${a}`);

    // パターン18: a / (b - c / d) = 24
    if (d !== 0 && b - c / d !== 0 && a / (b - c / d) === 24) solutions.push(`${a} / (${b} - ${c} / ${d})`);
    if (d !== 0 && c - b / d !== 0 && a / (c - b / d) === 24) solutions.push(`${a} / (${c} - ${b} / ${d})`);
    if (d !== 0 && a - c / d !== 0 && b / (a - c / d) === 24) solutions.push(`${b} / (${a} - ${c} / ${d})`);
    if (d !== 0 && c - a / d !== 0 && b / (c - a / d) === 24) solutions.push(`${b} / (${c} - ${a} / ${d})`);
    if (d !== 0 && a - b / d !== 0 && c / (a - b / d) === 24) solutions.push(`${c} / (${a} - ${b} / ${d})`);
    if (d !== 0 && b - a / d !== 0 && c / (b - a / d) === 24) solutions.push(`${c} / (${b} - ${a} / ${d})`);
    if (c !== 0 && b - d / c !== 0 && a / (b - d / c) === 24) solutions.push(`${a} / (${b} - ${d} / ${c})`);
    if (c !== 0 && d - b / c !== 0 && a / (d - b / c) === 24) solutions.push(`${a} / (${d} - ${b} / ${c})`);
    if (c !== 0 && a - d / c !== 0 && b / (a - d / c) === 24) solutions.push(`${b} / (${a} - ${d} / ${c})`);
    if (c !== 0 && d - a / c !== 0 && b / (d - a / c) === 24) solutions.push(`${b} / (${d} - ${a} / ${c})`);
    if (c !== 0 && a - b / c !== 0 && d / (a - b / c) === 24) solutions.push(`${d} / (${a} - ${b} / ${c})`);
    if (c !== 0 && b - a / c !== 0 && d / (b - a / c) === 24) solutions.push(`${d} / (${b} - ${a} / ${c})`);
    if (b !== 0 && c - d / b !== 0 && a / (c - d / b) === 24) solutions.push(`${a} / (${c} - ${d} / ${b})`);
    if (b !== 0 && d - c / b !== 0 && a / (d - c / b) === 24) solutions.push(`${a} / (${d} - ${c} / ${b})`);
    if (b !== 0 && a - d / b !== 0 && c / (a - d / b) === 24) solutions.push(`${c} / (${a} - ${d} / ${b})`);
    if (b !== 0 && d - a / b !== 0 && c / (d - a / b) === 24) solutions.push(`${c} / (${d} - ${a} / ${b})`);
    if (b !== 0 && a - c / b !== 0 && d / (a - c / b) === 24) solutions.push(`${d} / (${a} - ${c} / ${b})`);
    if (b !== 0 && c - a / b !== 0 && d / (c - a / b) === 24) solutions.push(`${d} / (${c} - ${a} / ${b})`);
    if (a !== 0 && c - d / a !== 0 && b / (c - d / a) === 24) solutions.push(`${b} / (${c} - ${d} / ${a})`);
    if (a !== 0 && d - c / a !== 0 && b / (d - c / a) === 24) solutions.push(`${b} / (${d} - ${c} / ${a})`);
    if (a !== 0 && b - d / a !== 0 && c / (b - d / a) === 24) solutions.push(`${c} / (${b} - ${d} / ${a})`);
    if (a !== 0 && d - b / a !== 0 && c / (d - b / a) === 24) solutions.push(`${c} / (${d} - ${b} / ${a})`);
    if (a !== 0 && b - c / a !== 0 && d / (b - c / a) === 24) solutions.push(`${d} / (${b} - ${c} / ${a})`);
    if (a !== 0 && c - b / a !== 0 && d / (c - b / a) === 24) solutions.push(`${d} / (${c} - ${b} / ${a})`);

    // パターン19: a * b + c + d = 24
    if (a * b + c + d === 24) solutions.push(`${a} * ${b} + ${c} + ${d}`);
    if (a * c + b + d === 24) solutions.push(`${a} * ${c} + ${b} + ${d}`);
    if (a * d + b + c === 24) solutions.push(`${a} * ${d} + ${b} + ${c}`);
    if (b * c + a + d === 24) solutions.push(`${b} * ${c} + ${a} + ${d}`);
    if (b * d + a + c === 24) solutions.push(`${b} * ${d} + ${a} + ${c}`);
    if (c * d + a + b === 24) solutions.push(`${c} * ${d} + ${a} + ${b}`);

    // パターン20: (a - b) * (c / d) = 24
    if (d !== 0 && (a - b) * (c / d) === 24) solutions.push(`(${a} - ${b}) * (${c} / ${d})`);
    if (d !== 0 && (b - a) * (c / d) === 24) solutions.push(`(${b} - ${a}) * (${c} / ${d})`);
    if (d !== 0 && (a - c) * (b / d) === 24) solutions.push(`(${a} - ${c}) * (${b} / ${d})`);
    if (d !== 0 && (c - a) * (b / d) === 24) solutions.push(`(${c} - ${a}) * (${b} / ${d})`);
    if (d !== 0 && (b - c) * (a / d) === 24) solutions.push(`(${b} - ${c}) * (${a} / ${d})`);
    if (d !== 0 && (c - b) * (a / d) === 24) solutions.push(`(${c} - ${b}) * (${a} / ${d})`);
    if (c !== 0 && (a - b) * (d / c) === 24) solutions.push(`(${a} - ${b}) * (${d} / ${c})`);
    if (c !== 0 && (b - a) * (d / c) === 24) solutions.push(`(${b} - ${a}) * (${d} / ${c})`);
    if (c !== 0 && (a - d) * (b / c) === 24) solutions.push(`(${a} - ${d}) * (${b} / ${c})`);
    if (c !== 0 && (d - a) * (b / c) === 24) solutions.push(`(${d} - ${a}) * (${b} / ${c})`);
    if (c !== 0 && (b - d) * (a / c) === 24) solutions.push(`(${b} - ${d}) * (${a} / ${c})`);
    if (c !== 0 && (d - b) * (a / c) === 24) solutions.push(`(${d} - ${b}) * (${a} / ${c})`);
    if (b !== 0 && (a - c) * (d / b) === 24) solutions.push(`(${a} - ${c}) * (${d} / ${b})`);
    if (b !== 0 && (c - a) * (d / b) === 24) solutions.push(`(${c} - ${a}) * (${d} / ${b})`);
    if (b !== 0 && (a - d) * (c / b) === 24) solutions.push(`(${a} - ${d}) * (${c} / ${b})`);
    if (b !== 0 && (d - a) * (c / b) === 24) solutions.push(`(${d} - ${a}) * (${c} / ${b})`);
    if (b !== 0 && (c - d) * (a / b) === 24) solutions.push(`(${c} - ${d}) * (${a} / ${b})`);
    if (b !== 0 && (d - c) * (a / b) === 24) solutions.push(`(${d} - ${c}) * (${a} / ${b})`);
    if (a !== 0 && (b - c) * (d / a) === 24) solutions.push(`(${b} - ${c}) * (${d} / ${a})`);
    if (a !== 0 && (c - b) * (d / a) === 24) solutions.push(`(${c} - ${b}) * (${d} / ${a})`);
    if (a !== 0 && (b - d) * (c / a) === 24) solutions.push(`(${b} - ${d}) * (${c} / ${a})`);
    if (a !== 0 && (d - b) * (c / a) === 24) solutions.push(`(${d} - ${b}) * (${c} / ${a})`);
    if (a !== 0 && (c - d) * (b / a) === 24) solutions.push(`(${c} - ${d}) * (${b} / ${a})`);
    if (a !== 0 && (d - c) * (b / a) === 24) solutions.push(`(${d} - ${c}) * (${b} / ${a})`);

    // パターン21: (a + b) * c + d = 24
    if ((a + b) * c + d === 24) solutions.push(`(${a} + ${b}) * ${c} + ${d}`);
    if ((a + b) * d + c === 24) solutions.push(`(${a} + ${b}) * ${d} + ${c}`);
    if ((a + c) * b + d === 24) solutions.push(`(${a} + ${c}) * ${b} + ${d}`);
    if ((a + c) * d + b === 24) solutions.push(`(${a} + ${c}) * ${d} + ${b}`);
    if ((a + d) * b + c === 24) solutions.push(`(${a} + ${d}) * ${b} + ${c}`);
    if ((a + d) * c + b === 24) solutions.push(`(${a} + ${d}) * ${c} + ${b}`);
    if ((b + c) * a + d === 24) solutions.push(`(${b} + ${c}) * ${a} + ${d}`);
    if ((b + c) * d + a === 24) solutions.push(`(${b} + ${c}) * ${d} + ${a}`);
    if ((b + d) * a + c === 24) solutions.push(`(${b} + ${d}) * ${a} + ${c}`);
    if ((b + d) * c + a === 24) solutions.push(`(${b} + ${d}) * ${c} + ${a}`);
    if ((c + d) * a + b === 24) solutions.push(`(${c} + ${d}) * ${a} + ${b}`);
    if ((c + d) * b + a === 24) solutions.push(`(${c} + ${d}) * ${b} + ${a}`);

    // パターン22: (a * b) / (c - d) = 24
    if (c - d !== 0 && (a * b) / (c - d) === 24) solutions.push(`(${a} * ${b}) / (${c} - ${d})`);
    if (d - c !== 0 && (a * b) / (d - c) === 24) solutions.push(`(${a} * ${b}) / (${d} - ${c})`);
    if (c - d !== 0 && (a * c) / (b - d) === 24) solutions.push(`(${a} * ${c}) / (${b} - ${d})`);
    if (d - b !== 0 && (a * c) / (d - b) === 24) solutions.push(`(${a} * ${c}) / (${d} - ${b})`);
    if (c - d !== 0 && (a * d) / (b - c) === 24) solutions.push(`(${a} * ${d}) / (${b} - ${c})`);
    if (c - b !== 0 && (a * d) / (c - b) === 24) solutions.push(`(${a} * ${d}) / (${c} - ${b})`);
    if (c - d !== 0 && (b * c) / (a - d) === 24) solutions.push(`(${b} * ${c}) / (${a} - ${d})`);
    if (d - a !== 0 && (b * c) / (d - a) === 24) solutions.push(`(${b} * ${c}) / (${d} - ${a})`);
    if (c - d !== 0 && (b * d) / (a - c) === 24) solutions.push(`(${b} * ${d}) / (${a} - ${c})`);
    if (c - a !== 0 && (b * d) / (c - a) === 24) solutions.push(`(${b} * ${d}) / (${c} - ${a})`);
    if (b - d !== 0 && (c * d) / (a - b) === 24) solutions.push(`(${c} * ${d}) / (${a} - ${b})`);
    if (b - a !== 0 && (c * d) / (b - a) === 24) solutions.push(`(${c} * ${d}) / (${b} - ${a})`);
    if (b - d !== 0 && (a * b) / (c - d) === 24) solutions.push(`(${a} * ${b}) / (${c} - ${d})`);
    if (b - c !== 0 && (a * c) / (b - d) === 24) solutions.push(`(${a} * ${c}) / (${b} - ${d})`);
    if (b - c !== 0 && (a * d) / (b - c) === 24) solutions.push(`(${a} * ${d}) / (${b} - ${c})`);
    if (a - d !== 0 && (b * c) / (a - d) === 24) solutions.push(`(${b} * ${c}) / (${a} - ${d})`);
    if (a - c !== 0 && (b * d) / (a - c) === 24) solutions.push(`(${b} * ${d}) / (${a} - ${c})`);
    if (a - b !== 0 && (c * d) / (a - b) === 24) solutions.push(`(${c} * ${d}) / (${a} - ${b})`);

    // パターン23: (a - b) * c - d = 24
    if ((a - b) * c - d === 24) solutions.push(`(${a} - ${b}) * ${c} - ${d}`);
    if ((a - b) * d - c === 24) solutions.push(`(${a} - ${b}) * ${d} - ${c}`);
    if ((a - c) * b - d === 24) solutions.push(`(${a} - ${c}) * ${b} - ${d}`);
    if ((a - c) * d - b === 24) solutions.push(`(${a} - ${c}) * ${d} - ${b}`);
    if ((a - d) * b - c === 24) solutions.push(`(${a} - ${d}) * ${b} - ${c}`);
    if ((a - d) * c - b === 24) solutions.push(`(${a} - ${d}) * ${c} - ${b}`);
    if ((b - a) * c - d === 24) solutions.push(`(${b} - ${a}) * ${c} - ${d}`);
    if ((b - a) * d - c === 24) solutions.push(`(${b} - ${a}) * ${d} - ${c}`);
    if ((b - c) * a - d === 24) solutions.push(`(${b} - ${c}) * ${a} - ${d}`);
    if ((b - c) * d - a === 24) solutions.push(`(${b} - ${c}) * ${d} - ${a}`);
    if ((b - d) * a - c === 24) solutions.push(`(${b} - ${d}) * ${a} - ${c}`);
    if ((b - d) * c - a === 24) solutions.push(`(${b} - ${d}) * ${c} - ${a}`);
    if ((c - a) * b - d === 24) solutions.push(`(${c} - ${a}) * ${b} - ${d}`);
    if ((c - a) * d - b === 24) solutions.push(`(${c} - ${a}) * ${d} - ${b}`);
    if ((c - b) * a - d === 24) solutions.push(`(${c} - ${b}) * ${a} - ${d}`);
    if ((c - b) * d - a === 24) solutions.push(`(${c} - ${b}) * ${d} - ${a}`);
    if ((c - d) * a - b === 24) solutions.push(`(${c} - ${d}) * ${a} - ${b}`);
    if ((c - d) * b - a === 24) solutions.push(`(${c} - ${d}) * ${b} - ${a}`);
    if ((d - a) * b - c === 24) solutions.push(`(${d} - ${a}) * ${b} - ${c}`);
    if ((d - a) * c - b === 24) solutions.push(`(${d} - ${a}) * ${c} - ${b}`);
    if ((d - b) * a - c === 24) solutions.push(`(${d} - ${b}) * ${a} - ${c}`);
    if ((d - b) * c - a === 24) solutions.push(`(${d} - ${b}) * ${c} - ${a}`);
    if ((d - c) * a - b === 24) solutions.push(`(${d} - ${c}) * ${a} - ${b}`);
    if ((d - c) * b - a === 24) solutions.push(`(${d} - ${c}) * ${b} - ${a}`);

    // レベルに応じて使用可能な演算子でフィルタリング
    const config = levelConfig[gameState.level] || levelConfig[1];
    const allowedOperators = config.operators || ['+', '-', '*', '/', '(', ')'];

    const filteredSolutions = solutions.filter(solution => {
        const usedOperators = solution.match(/[\+\-\*\/\(\)]/g) || [];
        return usedOperators.every(op => allowedOperators.includes(op));
    });

    return filteredSolutions;
}

// ゲーム開始
init();


// 紙吹雪演出
function triggerConfetti() {
    // canvas-confettiが読み込まれているかチェック
    if (typeof confetti === 'function') {
        const canvas = document.getElementById('confettiCanvas');
        if (!canvas) return;

        // キャンバスのサイズを親要素に合わせる（念のため）
        // CSSで100%に設定しているが、描画解像度を合わせる必要があるかも知れない
        // canvas-confetti.createを使用すると、自動的にリサイズ処理などもしてくれる場合があるが、
        // ここでは親要素のサイズを取得して設定する
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // キャンバス専用のインスタンスを作成
        const myConfetti = confetti.create(canvas, {
            resize: true,
            useWorker: true
        });

        // デフォルトの紙吹雪
        myConfetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });

        // 左側からの発射
        setTimeout(() => {
            myConfetti({
                particleCount: 50,
                angle: 60,
                spread: 55,
                origin: { x: 0 }
            });
        }, 200);

        // 右側からの発射
        setTimeout(() => {
            myConfetti({
                particleCount: 50,
                angle: 120,
                spread: 55,
                origin: { x: 1 }
            });
        }, 400);

        // 最後に大量の紙吹雪
        setTimeout(() => {
            const end = Date.now() + 1000;

            (function frame() {
                myConfetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 }
                });
                myConfetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 }
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());
        }, 1000);
    }
}
