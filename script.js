const comet = document.getElementById('comet');
const swipeText = document.getElementById('swipe-text');
const whiteFlash = document.getElementById('white-flash');

const tailSvg = document.getElementById('tail-svg');
const tailPath = document.getElementById('tail-path');
const tailStopTop = document.getElementById('tail-stop-top');

const startY = 506; // Initial top position from Frame 30
const endY = 214;   // Final top position from Frame 33/34
const maxDistance = startY - endY;

let isDragging = false;
let currentY = startY;
let dragStartY = 0;
let initialCometY = 0;
let isSnapping = false;

comet.addEventListener('mousedown', startDrag);
comet.addEventListener('touchstart', startDrag, {passive: false});

window.addEventListener('mousemove', drag);
window.addEventListener('touchmove', drag, {passive: false});

window.addEventListener('mouseup', endDrag);
window.addEventListener('touchend', endDrag);

function startDrag(e) {
    if (isSnapping) return;
    isDragging = true;
    dragStartY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    initialCometY = currentY;
}

function drag(e) {
    if (!isDragging) return;
    
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    const deltaY = clientY - dragStartY;
    
    // Calculate new position
    currentY = initialCometY + deltaY;
    
    // Constrain Y to not go below the start point
    if (currentY > startY) currentY = startY;
    
    updateUI(currentY);
}

function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    
    if (currentY <= startY - 60) {
        // Trigger launch animation to the top
        isSnapping = true;
        let startLaunchY = currentY;
        let startTime = null;
        const duration = 120; // Fast fly to top
        
        function animateLaunch(timestamp) {
            if (!startTime) startTime = timestamp;
            const t = Math.min(1, (timestamp - startTime) / duration);
            
            // easeIn quad for accelerating upwards
            const easeT = t * t; 
            
            currentY = startLaunchY + (endY - startLaunchY) * easeT;
            updateUI(currentY);
            
            if (t < 1) {
                requestAnimationFrame(animateLaunch);
            } else {
                // Reached the top, trigger final launch flash (Frame 34)
                currentY = endY;
                updateUI(currentY);
                whiteFlash.style.opacity = 1;
                
                // Optional: Reset state after a delay to allow repeated testing
                setTimeout(() => {
                    currentY = startY;
                    updateUI(currentY);
                    whiteFlash.style.opacity = 0;
                    isSnapping = false;
                }, 1500);
            }
        }
        
        requestAnimationFrame(animateLaunch);
    } else {
        // Snap back to start using requestAnimationFrame for smooth shape update
        isSnapping = true;
        let startSnapY = currentY;
        let startTime = null;
        const duration = 250;
        
        function animateSnap(timestamp) {
            if (!startTime) startTime = timestamp;
            const t = Math.min(1, (timestamp - startTime) / duration);
            
            // easeOutBack equivalent for a nice bounce
            const c1 = 1.70158;
            const c3 = c1 + 1;
            const easeT = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
            
            // Since easeOutBack can overshoot, clamp currentY if it goes below startY
            let animY = startSnapY + (startY - startSnapY) * easeT;
            if (animY > startY + 20) animY = startY + 20; // slight bounce limit
            
            currentY = animY;
            updateUI(currentY);
            
            if (t < 1) {
                requestAnimationFrame(animateSnap);
            } else {
                currentY = startY;
                updateUI(currentY);
                isSnapping = false;
            }
        }
        
        requestAnimationFrame(animateSnap);
    }
}

function updateUI(y) {
    comet.style.top = `${y}px`;
    
    // Calculate progress from 0 to 1
    let progress = (startY - y) / maxDistance;
    progress = Math.max(0, Math.min(1, progress));
    
    // 1. Text fades out early
    if (progress > 0) {
        // Opacity drops from 0.45 down to 0
        const opacity = Math.max(0, 0.45 - (progress * 1.5));
        swipeText.style.opacity = opacity;
    } else {
        swipeText.style.opacity = 0.45;
    }
    
    // 2. Comet tail (Parabolic)
    if (y < startY) {
        tailSvg.style.opacity = Math.min(1, progress * 2); // Fade in quickly
        
        // Peak is at the center of the comet
        const cometCenterY = y + 43.8; 
        
        // Width scales dynamically from small to wide
        const tailWidth = 150 + (progress * 900);
        
        const leftX = 270 - tailWidth / 2;
        const rightX = 270 + tailWidth / 2;
        
        // For a quadratic bezier starting at (leftX, 620) and ending at (rightX, 620),
        // to have its peak exactly at y=cometCenterY, the control point's Y must be:
        const ctrlY = 2 * cometCenterY - 620;
        
        const pathData = `M ${leftX} 620 Q 270 ${ctrlY} ${rightX} 620 Z`;
        tailPath.setAttribute('d', pathData);
        
        // Gradient color intensity increases (alpha 0.3 to 1.0)
        const alpha = 0.3 + (progress * 0.7);
        tailStopTop.setAttribute('stop-color', `rgba(255, 255, 255, ${alpha})`);
        
    } else {
        tailSvg.style.opacity = 0;
    }
}
