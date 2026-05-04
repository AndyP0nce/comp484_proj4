const testWrapper = document.querySelector(".test-wrapper");
const testArea = document.querySelector("#test-area");
const originText = document.querySelector("#origin-text p").innerHTML;
const resetButton = document.querySelector("#reset");
const theTimer = document.querySelector(".timer");

// Added: grab the WPM display, error counter, and scoreboard list from the DOM
const wpmDisplay = document.querySelector("#wpm");
const errordisplay = document.querySelector("#errors");
const scorelist = document.querySelector("#scorelist");


// state variables
let intervalId   = null;   // Holds the setInterval reference so we can stop it
let timerRunning = false;  // Flag: have we started the timer yet?
let hundredths   = 0;      // Timer counter: hundredths of a second (0–99)
let seconds      = 0;      // Timer counter: seconds (0–59)
let minutes      = 0;      // Timer counter: minutes (0+)
let errorCount   = 0;      // How many mismatches occurred in this session
let currentText  = "";     // The currently active paragraph to type

// Add leading zero to numbers 9 or below (purely for aesthetics):
function addZero(num) {
    if (num <= 9) {
        num = "0" + num;
    }
    return num; //otherwise it's already two digits, return as is
}

// Run a standard minute/second/hundredths timer:

function runTimer() {
    intervalId = setInterval(function() {
        hundredths++;

        if (hundredths === 100) {
            hundredths = 0;
            seconds++;
            updateWPM(); // Update WPM every second
        }

        if (seconds === 60) {
            seconds = 0;
            minutes++;
        }

        theTimer.innerHTML = addZero(minutes) + ":" + addZero(seconds) + ":" + addZero(hundredths);
    }, 10); // 10 milliseconds = 1 hundredth of a second
}

// Added: calculates and displays words per minute using the standard formula (chars / 5) / (seconds / 60)
function updateWPM() {
    const totalSec = (minutes * 60) + seconds;
    if (totalSec === 0) return; // avoid division by zero before the timer has ticked
    const charsTyped = testArea.value.length;
    const wpm = Math.round((charsTyped / 5) / (totalSec / 60)); // average word = 5 characters
    wpmDisplay.innerHTML = "WPM: " + wpm;
}

// Added: pool of random paragraphs — one is picked each time the test starts or resets
const paragraphs = [
    "Rainbow Six Siege is a tactical shooter where operators from elite units around the world clash in close-quarters combat. Each operator brings a unique gadget drawn from their real-world unit, whether it is a drone jammer, a barbed wire deployer, or a bulletproof camera.",

    "Ash is one of the most picked attackers in Rainbow Six Siege, hailing from the FBI SWAT unit. Her breaching round launcher destroys defender gadgets and soft walls from a safe distance, letting her team push without exposing themselves.",

    "Thermite carries a Exothermic Charge that can blast through reinforced walls, making him one of the most essential operators in the entire game. Without a hard breacher on the attacking team, defenders can seal off the objective and hold an almost impenetrable fortress.",

    "On the defending side, Rook quietly drops an armor pack at the start of every round, giving his entire team access to extra protection for free. His passive contribution makes him one of the best anchor operators for players learning the game.",

    "Jager is a German operator from GSG 9 whose Active Defense System automatically destroys incoming grenades before they reach the defenders. His two speed rating lets him roam the map and gather information while his ADS gadgets silently protect his teammates holding the objective."
];

// Added: picks a random paragraph, stores it in currentText, and injects it into the page
function getRandomParagraph() {
    const randomIndex = Math.floor(Math.random() * paragraphs.length);
    currentText = paragraphs[randomIndex];
    document.querySelector("#origin-text p").innerHTML = currentText;
}

// Match the text entered with the provided text on the page:

function matchText() {
    const typeText = testArea.value;
    // Added: slice the target text down to however many characters the user has typed so far
    const originSubstr = currentText.substring(0, typeText.length);

    if (typeText === currentText) {
        // Test complete — stop the timer and turn green
        clearInterval(intervalId);
        timerRunning = false;
        testWrapper.style.borderColor = "green";
        saveScore();   // Added: record the finishing time to the leaderboard
        updateWPM();   // Added: do a final WPM calculation on completion
    } else if (typeText === originSubstr) {
        // Added: input matches the target so far — show blue while the user is on track
        testWrapper.style.borderColor = "blue";
    } else {
        // Mismatch — turn red and increment the error counter
        testWrapper.style.borderColor = "red";
        errorCount++;
        errordisplay.innerHTML = "Errors: " + errorCount; // Added: update the live error display
    }
}

// Start the timer:

function startTimer() {
    if (!timerRunning) {
        timerRunning = true;
        runTimer();
    }
}

// Reset everything:
function resetTest() {
    clearInterval(intervalId);
    timerRunning = false;
    hundredths = 0;
    seconds = 0;
    minutes = 0;
    errorCount = 0;
    theTimer.innerHTML = "00:00:00";
    errordisplay.innerHTML = "Errors: 0";   // Added: reset the error display
    wpmDisplay.innerHTML = "WPM: 0";        // Added: reset the WPM display
    testArea.value = "";
    testWrapper.style.borderColor = "grey";
    getRandomParagraph();   // Added: load a new random paragraph on every reset
    renderScores();         // Added: keep the scoreboard visible after resetting
}

// Added: converts the finishing time to hundredths, saves the top 3 fastest times to localStorage
function saveScore() {
    const totalHundredths = (minutes * 6000) + (seconds * 100) + hundredths;
    if (totalHundredths === 0) return; // ignore invalid zero-time saves from old buggy data
    let scores = [];
    try {
        scores = JSON.parse(localStorage.getItem("topScores")) || [];
    } catch (e) {} // localStorage can fail in private mode or file:// in some browsers
    scores = scores.filter(function(s) { return s > 0; }); // strip out any 00:00:00 junk scores
    scores.push(totalHundredths);
    scores.sort(function(a, b) { return a - b; }); // sort ascending so fastest times rank first
    scores = scores.slice(0, 3); // keep only the top 3
    try {
        localStorage.setItem("topScores", JSON.stringify(scores));
    } catch (e) {}
    renderScores(scores); // pass scores directly so the display doesn't need a second localStorage read
}

// Added: reads the top scores and builds the ordered list on the page
function renderScores(scores) {
    // if called with no argument (page load / reset), fall back to reading from localStorage
    if (!scores) {
        try {
            scores = JSON.parse(localStorage.getItem("topScores")) || [];
        } catch (e) {
            scores = [];
        }
    }
    scorelist.innerHTML = ""; // clear previous entries before re-rendering
    if (scores.length === 0) {
        scorelist.innerHTML = "<li>No scores yet!</li>";
        return;
    }
    // convert each stored hundredths value back to mm:ss:hs and create a list item
    scores.forEach(function(totalHundredths, index) {
        const m  = Math.floor(totalHundredths / 6000);
        const s  = Math.floor((totalHundredths % 6000) / 100);
        const hs = totalHundredths % 100;
        const li = document.createElement("li");
        li.innerHTML = "#" + (index + 1) + " — " + addZero(m) + ":" + addZero(s) + ":" + addZero(hs);
        scorelist.appendChild(li);
    });
}

// Event listeners for keyboard input and the reset button:

testArea.addEventListener("input", function() {
    startTimer();
    matchText();
});

resetButton.addEventListener("click", resetTest);

// Initialize the test on page load:
getRandomParagraph(); // Added: load a random paragraph immediately when the page opens
renderScores();       // Added: display any saved scores from localStorage on page load
