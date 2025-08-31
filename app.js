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
                currentHintIndex = 0; // reset hints after success
                document.getElementById("password").value = ""; // clear input
                
                // Redirect to birthday page after short delay
                setTimeout(() => {
                    window.location.href = "birthday.html";
                }, 1500);
            } else {
                let message = "❌ Access Denied.";
                
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
    document.getElementById("password").addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            checkPassword();
        }
    });
    
    // Add input animation
    document.getElementById("password").addEventListener("input", function() {
        this.style.transform = "scale(1.02)";
        setTimeout(() => {
            this.style.transform = "scale(1)";
        }, 150);
    });
});


// async function loadPhoto() {
//     const docRef = doc(db, "secrets", "photos");
//     const docSnap = await getDoc(docRef);
  
//     if (docSnap.exists()) {
//       const data = docSnap.data();
//       // we are storing only the fileId in Firestore
//       const fileId = data.dev2;
  
//       // construct the proper Google Drive link
//       const photoUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
  
//       console.log("Photo URL:", photoUrl);
  
//       const photoDisplay = document.getElementById('photoDisplay');
//       photoDisplay.innerHTML = `
//         <img src="${photoUrl}" 
//              alt="Loaded Image"
//              style="max-width: 100%; max-height: 100%; object-fit: contain; border: 2px solid #000;" />
//       `;
//     } else {
//       console.log("No such document!");
//     }
//   }

  async function loadPhoto() {
    try {
        const docRef = doc(db, "secrets", "photos");
        const docSnap = await getDoc(docRef);
      
        if (docSnap.exists()) {
            const data = docSnap.data();
            const fileId = data.dev2;
            
            console.log("Retrieved fileId:", fileId);
            
            // Try multiple Google Drive URL formats
            const photoUrls = [
                `https://drive.google.com/uc?export=view&id=${fileId}`,
                `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
                `https://lh3.googleusercontent.com/d/${fileId}=w1000`
            ];
            
            const photoDisplay = document.getElementById('photoDisplay');
            
            // Show loading state
            photoDisplay.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                    <div style="font-size: 2rem; margin-bottom: 10px;">📷</div>
                    <p>Loading your special photo...</p>
                </div>
            `;
            
            // Try to load the image with the first URL
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
            photoDisplay.innerHTML = `
                <img src="${photoUrl}" 
                     alt="Special Birthday Memory"
                     style="max-width: 100%; max-height: 100%; object-fit: contain; border: 2px solid #000;" />
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
        }, 10000); // 10 second timeout
        
        img.src = photoUrl;
    });
}

async function tryAlternativeUrls(fileId, photoDisplay) {
    const alternativeUrls = [
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
        `https://lh3.googleusercontent.com/d/${fileId}=w1000`,
        `https://drive.google.com/file/d/${fileId}/view`
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
                         style="max-width: 100%; max-height: 100%; object-fit: contain; border: 2px solid #000;" />
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
        }, 5000);
        
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
            <div style="font-size: 3rem; margin-bottom: 15px;">🔐</div>
            <h3 style="margin-bottom: 15px;">Photo Access Issue</h3>
            <p style="margin-bottom: 10px;">To fix this, make sure the Google Drive file is:</p>
            <ol style="text-align: left; margin: 15px 0; padding-left: 20px;">
                <li><strong>Publicly accessible</strong> (Anyone with the link can view)</li>
                <li><strong>Not restricted</strong> to specific Google accounts</li>
            </ol>
            <p style="margin-top: 15px; font-size: 0.9rem; color: #666;">
                File ID: ${fileId}
            </p>
            <button onclick="retryPhotoLoad()" style="margin-top: 15px; padding: 8px 16px; background: #007bff; color: white; border: none; cursor: pointer;">
                🔄 Try Again
            </button>
        </div>
    `;
}

function showError(message) {
    const photoDisplay = document.getElementById('photoDisplay');
    if (photoDisplay) {
        photoDisplay.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #ff6b6b;">
                <div style="font-size: 2rem; margin-bottom: 10px;">⚠️</div>
                <p>${message}</p>
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
        `https://drive.google.com/uc?export=view&id=${fileId}`,
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
        `https://lh3.googleusercontent.com/d/${fileId}=w1000`,
        `https://drive.google.com/file/d/${fileId}/view`
    ];
    
    testUrls.forEach((url, index) => {
        console.log(`Test URL ${index + 1}:`, url);
        // You can manually test these URLs in your browser
    });
}
  

// Make function globally available
window.checkPassword = checkPassword;
window.loadPhoto = loadPhoto;
window.tryLoadImage = tryLoadImage;
window.retryPhotoLoad = retryPhotoLoad;
window.debugPhotoAccess = debugPhotoAccess;