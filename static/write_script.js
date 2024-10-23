document.addEventListener('DOMContentLoaded', (event) => {
    const socket = io();  // Simplified connection

    const quill = new Quill('#editor-container', {
        theme: 'snow'
    });

    quill.on('text-change', function(delta, oldDelta, source) {
        if (source === 'user') {
            const text = quill.getText();
            console.log('Sending text:', text);  // Log sent text
            socket.emit('write', text);
        }
    });

    socket.on('write', function(data) {
        console.log('Received text:', data);  // Log received text
        quill.setText(data);
    });
});
