import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase.js";

let attempts = 3;
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
                showResult("✅ Access Granted! Welcome to the system.", "success");
                currentHintIndex = 0; // reset hints after success
                document.getElementById("password").value = ""; // clear input
                
                // Reset button
                submitBtn.style.background = "";
                submitBtn.innerHTML = "<span>Authenticate</span>";
                submitBtn.disabled = false;
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

// Make function globally available
window.checkPassword = checkPassword;