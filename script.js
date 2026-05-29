const comet = document.getElementById('comet');
const swipeText = document.getElementById('swipe-text');
const whiteFlash = document.getElementById('white-flash');
const coverBg = document.getElementById('cover-bg');
const fullHomescreen = document.getElementById('full-homescreen');

const tailSvg = document.getElementById('tail-svg');
const tailPathMask = document.getElementById('tail-path-mask');
const tailPathGlow = document.getElementById('tail-path-glow');
const maskGrad = document.getElementById('homescreen-mask-grad');

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

const coverBgImages = [
    'bgs/Frame 2609175.png',
    'bgs/Frame 2609176.png',
    'bgs/Frame 2609178.png',
    'bgs/Group 5.png'
];
const coverBgColors = [
    'rgba(67, 56, 202, 0.95)',  // deeper indigo/purple
    'rgba(194, 65, 12, 0.95)',  // deeper orange
    'rgba(15, 118, 110, 0.95)', // deeper teal
    'rgba(190, 24, 93, 0.95)'   // deeper pink
];
let currentBgIndex = 0;

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
        currentBgIndex = (currentBgIndex - 1 + coverBgImages.length) % coverBgImages.length;
        updateBackground();
    } else if (e.key === 'ArrowDown') {
        currentBgIndex = (currentBgIndex + 1) % coverBgImages.length;
        updateBackground();
    }
});

function updateBackground() {
    if (coverBg) coverBg.src = coverBgImages[currentBgIndex];
    if (tailPathGlow) tailPathGlow.setAttribute('stroke', coverBgColors[currentBgIndex]);
}

// Set initial background color
updateBackground();

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
                fullHomescreen.style.opacity = 1;
                
                // Flash fades quickly
                setTimeout(() => {
                    whiteFlash.style.opacity = 0;
                }, 50);
                
                // Optional: Reset state after a delay to allow repeated testing
                setTimeout(() => {
                    currentY = startY;
                    updateUI(currentY);
                    fullHomescreen.style.opacity = 0;
                    isSnapping = false;
                }, 3000);
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
        
        // Width stays curvy (narrow) for most of the drag, then rapidly flattens near the top
        const tailWidth = 100 + (progress * 800) + (Math.pow(progress, 5) * 2500);
        
        const leftX = 270 - tailWidth / 2;
        const rightX = 270 + tailWidth / 2;
        
        // For a quadratic bezier starting at (leftX, 620) and ending at (rightX, 620),
        // to have its peak exactly at y=cometCenterY, the control point's Y must be:
        const ctrlY = 2 * cometCenterY - 620;
        
        const pathData = `M ${leftX} 620 Q 270 ${ctrlY} ${rightX} 620 Z`;
        const strokePathData = `M ${leftX} 620 Q 270 ${ctrlY} ${rightX} 620`;
        
        if (tailPathMask) tailPathMask.setAttribute('d', pathData);
        if (tailPathGlow) tailPathGlow.setAttribute('d', strokePathData);
        
        if (maskGrad) {
            const fadeLength = 300 - (progress * 200);
            maskGrad.setAttribute('y1', cometCenterY);
            maskGrad.setAttribute('y2', cometCenterY + fadeLength);
        }
        
        // Comet fades out as it nears the top
        let cometOpacity = 1;
        if (progress > 0.7) {
            cometOpacity = 1 - ((progress - 0.7) / 0.3);
        }
        comet.style.opacity = cometOpacity;
        
    } else {
        tailSvg.style.opacity = 0;
        comet.style.opacity = 1;
    }
}
