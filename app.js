import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase.js";

let attempts = 4;
let currentHintIndex = 0;

async function checkPassword() {
    const password = document.getElementById("password").value.trim();
    const resultDiv = document.getElementById("result");
    const submitBtn = document.querySelector('.submit-btn');
    
    if (!password) {
        showResult("⚠️ Please enter a password!", "warning");
        return;
    }
    
    // Add loading state
    submitBtn.style.background = "#666666";
    submitBtn.innerHTML = "<span>Checking...</span>";
    submitBtn.disabled = true;
    
    try {
        // Get the password document from the secrets collection
        const docRef = doc(db, "secrets", "passwordDoc");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            const correctPassword = data.password;
            const hints = data.hints;
            
            if (password === correctPassword) {
                showResult("✅ Access Granted! Redirecting...", "success");
                currentHintIndex = 0; 
                sessionStorage.setItem("accessGranted", "true");
                document.getElementById("password").value = ""; 
                
                
                setTimeout(() => {
                    window.location.href = "birthday.html";
                }, 1500);
            } else {
                let message = "❌ Access Denied.";
                document.getElementById("password").value = "";
                // Show hint if available
                if (Array.isArray(hints) && currentHintIndex < hints.length) {
                    message += "\n💡 Hint: " + hints[currentHintIndex];
                    currentHintIndex++;
                } else {
                    message += "\n⚠️ No more hints available!";
                }
                
                // Decrement attempts
                attempts--;
                if (attempts > 0) {
                    message += `\n🔢 ${attempts} attempts remaining.`;
                    
                    // Reset button for next attempt
                    submitBtn.style.background = "";
                    submitBtn.innerHTML = "<span>Authenticate</span>";
                    submitBtn.disabled = false;
                } else {
                    message += "\n🚫 No attempts left! Access locked.";
                    
                    // Lock everything
                    document.getElementById("password").disabled = true;
                    submitBtn.style.background = "#888888";
                    submitBtn.innerHTML = "<span>Locked</span>";
                    submitBtn.disabled = true;
                }
                
                showResult(message, "error");
            }
        } else {
            showResult("⚠️ Configuration not found!", "warning");
            
            // Reset button
            submitBtn.style.background = "";
            submitBtn.innerHTML = "<span>Authenticate</span>";
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error("Error getting document:", error);
        showResult("⚠️ Connection error. Please try again.", "error");
    }
    
    // Always reset button state (except when completely locked out)
    if (attempts > 0) {
        submitBtn.style.background = "";
        submitBtn.innerHTML = "<span>Authenticate</span>";
        submitBtn.disabled = false;
    }
}

function showResult(message, type) {
    const resultDiv = document.getElementById("result");
    resultDiv.textContent = message;
    resultDiv.className = `${type} show`;
    
    // Auto-hide after 5 seconds for non-critical messages
    if (type === "warning") {
        setTimeout(() => {
            resultDiv.classList.remove("show");
        }, 5000);
    }
}

// Add enter key support
document.addEventListener("DOMContentLoaded", function() {
    const passwordInput = document.getElementById("password");
    if (passwordInput) {
        passwordInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                checkPassword();
            }
        });
        
        // Add input animation
        passwordInput.addEventListener("input", function() {
            this.style.transform = "scale(1.02)";
            setTimeout(() => {
                this.style.transform = "scale(1)";
            }, 150);
        });
    }
});

async function loadPhoto() {
    try {
        const docRef = doc(db, "secrets", "photos");
        const docSnap = await getDoc(docRef);
      
        if (docSnap.exists()) {
            const data = docSnap.data();
            const fileId = data.dev2;
            
            console.log("Retrieved fileId:", fileId);
            
            // Use the working Google Drive thumbnail format first
            const photoUrls = [
                `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
                `https://lh3.googleusercontent.com/d/${fileId}=w1000`,
                `https://drive.google.com/uc?export=view&id=${fileId}`
            ];
            
            const photoDisplay = document.getElementById('photoDisplay');
            
            // Show loading state
            photoDisplay.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px;">
                    <div style="font-size: 2rem; margin-bottom: 10px;">📷</div>
                    <p style="color: #666;">Loading your special photo...</p>
                </div>
            `;
            
            // Try to load the image with the first URL (thumbnail format)
            await tryLoadImage(photoUrls[0], fileId, photoDisplay);
            
        } else {
            console.log("No document found in Firestore!");
            showError("No photo found in database");
        }
    } catch (error) {
        console.error("Error loading photo:", error);
        showError("Failed to load photo from database");
    }
}

async function tryLoadImage(photoUrl, fileId, photoDisplay) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = function() {
            console.log("Image loaded successfully!");
            
            // Mobile-friendly image display without borders
            photoDisplay.innerHTML = `
                <img src="${photoUrl}" 
                     alt="Special Birthday Memory"
                     style="
                        width: 100%; 
                        height: auto; 
                        max-height: 70vh; 
                        object-fit: contain; 
                        border-radius: 8px;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                     " />
            `;
            resolve();
        };
        
        img.onerror = function() {
            console.log("Primary URL failed, trying alternative formats...");
            tryAlternativeUrls(fileId, photoDisplay);
        };
        
        // Set a timeout for loading
        setTimeout(() => {
            if (!img.complete) {
                console.log("Image loading timeout, trying alternatives...");
                tryAlternativeUrls(fileId, photoDisplay);
            }
        }, 8000); // 8 second timeout (reduced for mobile)
        
        img.src = photoUrl;
    });
}

async function tryAlternativeUrls(fileId, photoDisplay) {
    const alternativeUrls = [
        `https://lh3.googleusercontent.com/d/${fileId}=w1000`,
        `https://drive.google.com/uc?export=view&id=${fileId}`,
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`
    ];
    
    for (let i = 0; i < alternativeUrls.length; i++) {
        const url = alternativeUrls[i];
        console.log(`Trying alternative URL ${i + 1}:`, url);
        
        try {
            const success = await testImageUrl(url);
            if (success) {
                photoDisplay.innerHTML = `
                    <img src="${url}" 
                         alt="Special Birthday Memory"
                         style="
                            width: 100%; 
                            height: auto; 
                            max-height: 70vh; 
                            object-fit: contain; 
                            border-radius: 8px;
                            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                         " />
                `;
                return;
            }
        } catch (error) {
            console.log(`Alternative URL ${i + 1} failed:`, error);
        }
    }
    
    // If all URLs fail, show instructions
    showGoogleDriveInstructions(fileId, photoDisplay);
}

function testImageUrl(url) {
    return new Promise((resolve) => {
        const img = new Image();
        const timeout = setTimeout(() => {
            resolve(false);
        }, 4000); // Reduced timeout for mobile
        
        img.onload = () => {
            clearTimeout(timeout);
            resolve(true);
        };
        
        img.onerror = () => {
            clearTimeout(timeout);
            resolve(false);
        };
        
        img.src = url;
    });
}

function showGoogleDriveInstructions(fileId, photoDisplay) {
    photoDisplay.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #333;">
            <div style="font-size: 2.5rem; margin-bottom: 15px;">🔐</div>
            <h3 style="margin-bottom: 15px; font-size: 1.2rem;">Photo Access Issue</h3>
            <p style="margin-bottom: 15px; font-size: 0.9rem;">Make sure the Google Drive file is publicly accessible</p>
            <button onclick="retryPhotoLoad()" style="
                margin-top: 15px; 
                padding: 12px 20px; 
                background: #007bff; 
                color: white; 
                border: none; 
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.9rem;
                font-weight: 600;
                transition: background 0.3s ease;
            " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">
                🔄 Try Again
            </button>
        </div>
    `;
}

function showError(message) {
    const photoDisplay = document.getElementById('photoDisplay');
    if (photoDisplay) {
        photoDisplay.innerHTML = `
            <div style="
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center; 
                height: 100%; 
                color: #ff6b6b;
                padding: 20px;
            ">
                <div style="font-size: 2rem; margin-bottom: 10px;">⚠️</div>
                <p style="font-size: 0.9rem; text-align: center;">${message}</p>
            </div>
        `;
    }
}

function retryPhotoLoad() {
    loadPhoto();
}

// Additional debugging function to test the file ID directly
function debugPhotoAccess(fileId) {
    console.log("=== DEBUGGING PHOTO ACCESS ===");
    console.log("File ID:", fileId);
    
    const testUrls = [
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
        `https://lh3.googleusercontent.com/d/${fileId}=w1000`,
        `https://drive.google.com/uc?export=view&id=${fileId}`,
        `https://drive.google.com/file/d/${fileId}/view`
    ];
    
    testUrls.forEach((url, index) => {
        console.log(`Test URL ${index + 1}:`, url);
        // You can manually test these URLs in your browser
    });
}

// export async function loadNotes() {
//     const notesDiv = document.getElementById("notesContent");

//     try {
//         const docRef = doc(db, "secrets", "notesDoc");
//         const docSnap = await getDoc(docRef);

//         if (docSnap.exists()) {
//             const data = docSnap.data();
//             const notes = data.notes || [];

//             notesDiv.innerHTML = ""; // clear previous content

//             let accumulatedDelay = 0; // keeps track of total delay so far

//             notes.forEach(line => {
//                 const p = document.createElement("p");
//                 p.textContent = line;
//                 p.style.opacity = 0;
//                 notesDiv.appendChild(p);

//                 // Estimate time: 80ms per character, minimum 1s per line
//                 const lineDelay = Math.max(1000, line.length * 80);

//                 setTimeout(() => {
//                     p.style.transition = "opacity 0.8s ease";
//                     p.style.opacity = 1;
//                 }, accumulatedDelay);

//                 accumulatedDelay += lineDelay; // add for next line
//             });
//         } else {
//             notesDiv.innerHTML = "<p>⚠️ Notes not found in database.</p>";
//         }
//     } catch (error) {
//         console.error("Error fetching notes:", error);
//         notesDiv.innerHTML = "<p>⚠️ Failed to load notes.</p>";
//     }
// }


let currentIndex = 1; // start from 1
let totalNotes = 1;

export async function loadNotes() {
    const notesDiv = document.getElementById("notesContent");
    const dotsContainer = document.getElementById("dotsContainer");

    try {
        const docRef = doc(db, "secrets", "notesDoc");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            totalNotes = data.totalNotes || 0;

            // Create dots
            dotsContainer.innerHTML = "";
            for (let i = 1; i <= totalNotes; i++) {
                const dot = document.createElement("div");
                dot.className = "dot";
                dot.addEventListener("click", () => showNote(i, data));
                dotsContainer.appendChild(dot);
            }

            showNote(currentIndex, data);

            document.getElementById("nextNote").onclick = () => {
                if (currentIndex < totalNotes) showNote(currentIndex + 1, data);
            };
            document.getElementById("prevNote").onclick = () => {
                if (currentIndex > 1) showNote(currentIndex - 1, data);
            };
        } else {
            notesDiv.innerHTML = "<p>⚠️ Notes not found in database.</p>";
        }
    } catch (error) {
        console.error("Error fetching notes:", error);
        notesDiv.innerHTML = "<p>⚠️ Failed to load notes.</p>";
    }
}

function showNote(index, data) {
    const notesDiv = document.getElementById("notesContent");
    const dots = document.querySelectorAll(".dot");

    currentIndex = index;
    notesDiv.innerHTML = "";

    const noteKey = `notes${index}`;
    const noteParagraphs = data[noteKey] || [];

    noteParagraphs.forEach((para, i) => {
        const p = document.createElement("p");
        p.textContent = para;
        p.style.opacity = 0;
        notesDiv.appendChild(p);

        // Fade in each paragraph one by one
        setTimeout(() => p.style.opacity = 1, i * 1600);
    });

    // Update dots
    dots.forEach(dot => dot.classList.remove("active"));
    if (dots[index - 1]) dots[index - 1].classList.add("active");
}




// Make function globally available
window.checkPassword = checkPassword;
window.loadPhoto = loadPhoto;
window.tryLoadImage = tryLoadImage;
window.retryPhotoLoad = retryPhotoLoad;
window.debugPhotoAccess = debugPhotoAccess;