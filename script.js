
// Initialize smile count from localStorage or set it to 0
let smileCount = parseInt(localStorage.getItem("smileCount")) || 0;
let userLocation = {};
let userIP = "";
let isCameraActive = false;
let genderEmoji ="😊"
const webcamVideo = document.getElementById("webcamVideo");

// Retrieve previously displayed jokes from localStorage or initialize as an empty array
let displayedJokes = JSON.parse(localStorage.getItem("displayedJokes")) || [];

// Display the initial smile count on page load
document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("smileCount").innerText = `Total Smiles: ${smileCount}`;
    await fetchUserLocation();
    fetchNewJoke();
    fetchRandomQuote();

    // document.getElementById("smileButton").addEventListener("click", () => {
    //     incrementSmileCounter();
    //     fetchNewJoke();
    // });

    document.getElementById("tryAgainButton").addEventListener("click", () => {
        fetchNewJoke();
    });

    // Camera toggle functionality
    document.getElementById("cameraToggle").addEventListener("change", toggleCamera);

    await loadFaceApiModels();
});

// Function to load face-api models
async function loadFaceApiModels() {
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceExpressionNet.loadFromUri('/models');
    await faceapi.nets.ageGenderNet.loadFromUri('/models');
    console.log("Face-api models loaded successfully");
}

// Fetch user location data
async function fetchUserLocation() {
    try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        userLocation = {
            country: data.country_name || "Unknown",
            city: data.city || "Unknown",
            region: data.region || "Unknown",
        };
        console.log("User Location:", userLocation);
    } catch (error) {
        console.error("Error fetching user location:", error);
    }
}

// Fetch and display a random quote
async function fetchRandomQuote() {
    try {
        const response = await fetch('quotes.json');
        const quotes = await response.json();
        const randomIndex = Math.floor(Math.random() * quotes.length);
        document.getElementById("quote").textContent = `"${quotes[randomIndex]}"`;
    } catch (error) {
        console.error("Error fetching quotes:", error);
    }
}

// Toggle Camera on/off based on checkbox status
async function toggleCamera(event) {
    const isCameraChecked = event.target.checked;

    if (isCameraChecked) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            webcamVideo.srcObject = stream;
            webcamVideo.style.display = "block";
            detectFaceAttributes();
        } catch (err) {
            console.error("Error accessing webcam:", err);
        }
    } else {
        const stream = webcamVideo.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        webcamVideo.style.display = "none";
    }
}

// Detect face attributes including smile, age, gender, and expressions
async function detectFaceAttributes() {
    const displaySize = { width: webcamVideo.width, height: webcamVideo.height };
    faceapi.matchDimensions(webcamVideo, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(webcamVideo)
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender();
        //console.log(detections)
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        if (resizedDetections.length > 0) {
            const detection = resizedDetections[0];
            const expressions = detection.expressions;
            const age = Math.round(detection.age);
            const gender = detection.gender;
            let maxExpression = '';
            let maxValue = -Infinity;

            // Check each expression and its value
            for (let key in expressions) {
                if (expressions[key] > maxValue) {
                    maxValue = expressions[key];
                    maxExpression = key;
                }
            }

            // Store the result in 'currentExpression'
            let currentExpression = maxExpression;

            // Output the highest expression
            console.log(currentExpression);

           

            // Age and Gender Conditions
            if (age < 18) {
              // Kid: gender-based
              genderEmoji = (gender === "male") ? "👦" : "👧"; // Boy for male, Girl for female
            } else if (age >= 18 && age < 60) {
              // Young Adult: gender-based
              genderEmoji = (gender === "male") ? "👨" : "👩"; // Man for male, Woman for female
            } else {
              // Older Adult: gender-based
              genderEmoji = (gender === "male") ? "👴" : "👵"; // Old man for male, Old woman for female
            }

                // Update the HTML with Age, Gender Image, and Expression
               // document.getElementById("ageGender").innerHTML = `<span class="large-smile">${genderEmoji}</span> `;


            //document.getElementById("ageGender").innerText = `Age: ${age -5} , Gender: ${gender}, Expression: ${currentExpression}`;

            // Check if the user is smiling
            if (expressions.happy > 0.9)  {
                incrementSmileCounter();
            }

            //console.log("Expressions: ", expressions);
            console.log(`Age: ${age}, Gender: ${gender}`);
        }
    }, 100); // Run detection every 100ms
}

// Increment smile count, update display, and store it in localStorage
function incrementSmileCounter() {
    let statusBar = document.getElementById("statusBar");
    
    smileCount++;
    localStorage.setItem("smileCount", smileCount);
    document.getElementById("smileCount").innerHTML = `<span class="large-smile">${genderEmoji}</span>: ${Math.trunc(smileCount/10)}`;
    statusBar.value = smileCount%10
    console.log(smileCount%10)
}

// Fetch and display a new joke (same function as before)
async function fetchNewJoke() {
    const maxRetries = 10;
    let joke = null;
    let selectedFile = "";
    let fileNumber, jokeIndex;
    let attempt = 0;

    try {
        while (attempt < maxRetries) {
            attempt++;
            const jokeCategory = Math.floor(Math.random() * 5);

            if (jokeCategory === 0) {
                selectedFile = userLocation.country === "India" ? "jokes/jokes_india.json" : "jokes/jokes_world.json";
            } else if (jokeCategory === 1) {
                const currentHour = new Date().getHours();
                selectedFile = currentHour < 12 ? "jokes/jokes_morning.json" : "jokes/jokes_evening.json";
            } else if (jokeCategory === 2) {
                const country = userLocation.country === "India" ? "india" : "world";
                const currentHour = new Date().getHours();
                selectedFile = currentHour < 12 ? `jokes/jokes_${country}_morning.json` : `jokes/jokes_${country}_evening.json`;
            } else {
                const minFileNumber = 1;
                const maxFileNumber = 6;
                fileNumber = Math.floor(Math.random() * (maxFileNumber - minFileNumber + 1)) + minFileNumber;
                selectedFile = `jokes/jokes${fileNumber}.json`;
            }

            const response = await fetch(selectedFile);
            const jokes = await response.json();

            jokeIndex = Math.floor(Math.random() * jokes.length);
            joke = jokes[jokeIndex];

            if (!isJokeDisplayed(selectedFile, jokeIndex)) {
                displayedJokes.push({ file: selectedFile, index: jokeIndex });
                localStorage.setItem("displayedJokes", JSON.stringify(displayedJokes));
                break;
            }
        }

        document.getElementById("jokeContainer").innerText = joke || "No more new jokes available. Please try again!";
    } catch (error) {
        resetDisplayedJokes();
        console.log("Resetting jokes cache:", error);
    }
}

// Function to reset the displayed jokes array
function resetDisplayedJokes() {
    displayedJokes = [];
    localStorage.setItem("displayedJokes", JSON.stringify(displayedJokes));
    console.log("Displayed jokes history has been reset.");
    alert("Joke history reset! Enjoy fresh jokes again.");
}

// Check if the joke has already been displayed
function isJokeDisplayed(selectedFile, jokeIndex) {
    return displayedJokes.some(j => j.file === selectedFile && j.index === jokeIndex);
}
