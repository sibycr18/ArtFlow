const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const socket = io();

let drawing = false;
let lastX = 0;
let lastY = 0;
let brushSize = 2;
let color = '#000000';
let username = '';
let eraserSize = 10;  // Default eraser size
let erasing = false; // Flag to indicate if the eraser is active

// Event listener for username input
const usernameInput = document.getElementById('username');
usernameInput.addEventListener('input', () => {
    username = usernameInput.value || 'Anonymous';
});

// Event listener for brush size slider
const brushSizeInput = document.getElementById('brushSize');
brushSizeInput.addEventListener('input', () => {
    brushSize = brushSizeInput.value;
    // console.log('Brush size updated to:', brushSize);
});

// Event listener for eraser size slider
const eraserSizeInput = document.getElementById('eraserSize');
eraserSizeInput.addEventListener('input', () => {
    eraserSize = eraserSizeInput.value;
    console.log('Eraser size updated to:', eraserSize);
});

// Event listener for the eraser button
const eraserButton = document.getElementById('eraser');
eraserButton.addEventListener('click', () => {
    erasing = !erasing;  // Toggle eraser mode
    if (erasing) {
        eraserButton.style.backgroundColor = 'lightgray'; // Indicate eraser is active
    } else {
        eraserButton.style.backgroundColor = ''; // Reset button style when not erasing
    }
});

// Event listener for color picker
const colorPicker = document.getElementById('colorPicker');
colorPicker.addEventListener('input', () => {
    color = colorPicker.value;
    // console.log('Color updated to:', color);
});

// Event listener for clear canvas button
const clearButton = document.getElementById('clearCanvas');
clearButton.addEventListener('click', () => {
    socket.emit('clearCanvas');
    clearCanvas();
});

// Canvas drawing events
canvas.addEventListener('mousedown', (event) => {
    drawing = true;
    lastX = event.offsetX;
    lastY = event.offsetY;
});
canvas.addEventListener('mouseup', () => drawing = false);
canvas.addEventListener('mousemove', draw);

// Function to handle drawing on the canvas
function draw(event) {
    if (!drawing) return;

    const drawColor = erasing ? '#ffffff' : color; // Use white (or canvas background color) for erasing
    const size = erasing ? eraserSize : brushSize;  // Use eraser size if erasing, otherwise use brush size
    // console.log('Erasing: ', erasing, '\tColor: ', drawColor,'\tSize:' ,size);
    const x = event.offsetX;
    const y = event.offsetY;
    const data = { x, y, lastX, lastY, brushSize: size, color: drawColor, username };

    socket.emit('draw', data);  // Emit the draw event to the server
    drawOnCanvas(data);  // Draw on the local canvas

    lastX = x;
    lastY = y;
}

// Function to draw on the canvas based on received data
function drawOnCanvas(data) {
    // console.log('Drawing on canvas:', data);
    ctx.beginPath();
    ctx.moveTo(data.lastX, data.lastY);
    ctx.lineTo(data.x, data.y);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.brushSize;
    ctx.stroke();
    ctx.closePath();
}

// Function to clear the canvas
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Socket event listener for drawing data from other users
socket.on('draw', (data) => {
    drawOnCanvas(data);
});

// Socket event listener for clearing the canvas
socket.on('clearCanvas', () => {
    console.log('Clearing canvas from server...');
    clearCanvas();
});

// Set the actual drawing resolution
function resizeCanvas() {
    // Preserve the current content before resizing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Set the canvas size to match its CSS size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Put the content back after resizing
    ctx.putImageData(imageData, 0, 0);
}

// Call this function on window resize
window.addEventListener('resize', resizeCanvas);
resizeCanvas();  // Call initially to set up the size