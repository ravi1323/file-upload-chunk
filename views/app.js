const SERVER_URI = 'http://localhost:3000';

var fileUploadChunkSize = 3 * 1024;
var form = document.getElementById('form')
var fileInput = document.getElementById('file')
var file = null;



const socket = io(SERVER_URI);

var chunkSize = 10 * 1024; // 10 kelobytes

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) uploadFile(e.target.files);
})


const uploadFile = (files) => {
    var currentChunk = 0;
    const file = files[0];
    var totalChunks = Math.ceil(file.size / chunkSize);
    
    var reader = new FileReader();
    let from = currentChunk * chunkSize;
    let to = from + chunkSize;
    let blob = file.slice(from, to);
    reader.onload = (e) => {
        socket.emit("file-upload-start", {
            currentChunk,
            totalChunks,
            fileName: file.name,
            data: e.target.result
        })
    }
    reader.readAsDataURL(blob);


    socket.on('more-data', (fileInfo) => {
        const {
            fileName,
            nextChunk
        } = fileInfo;
        currentChunk++;
        let from = currentChunk * chunkSize;
        let to = from + chunkSize;
        var reader = new FileReader();
        let blob = file.slice(from, to);
        reader.onload = (e) => {
            document.getElementById('progress').innerText = Math.ceil((nextChunk / totalChunks) * 100).toString() + '%';
            socket.emit('more-data', {
                currentChunk: nextChunk,
                totalChunks,
                fileName,
                data: e.target.result
            })
        }
        reader.readAsDataURL(blob);
    })

    socket.on('file-upload-complete', (info) => {
        const {
            fileName,
            link
        } = info;

        document.getElementById('fileLink').innerHTML = `<a href="${link}">${fileName}</a>`
    })
}