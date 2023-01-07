import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import md5 from "md5";
import {createServer} from 'http'
import {Server} from 'socket.io'
import {v4} from 'uuid'

const SERVER_URI = 'http://localhost:3000';

const port = 3000;
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer)

io.on('connection', (socket) => {
  console.log(socket.id)
  socket.on('file-upload-start', (fileChunk) => {
    var {
      currentChunk,
      totalChunks,
      data,
      fileName
    } = fileChunk;
    const ext = fileName.split('.').pop();
    data = data.toString().split(',')[1];
    const newFileName = 'tmp_' + v4() + '.' + ext;
    const buffer = new Buffer.from(data, 'base64');
    fs.appendFileSync('./uploads/'+newFileName, buffer);

    if(currentChunk !== totalChunks - 1) {
      socket.emit('more-data', {
        fileName: newFileName,
        nextChunk: currentChunk + 1
      })
    }

    socket.on('more-data', (fileChunk) => {
      var {
        currentChunk,
        totalChunks,
        data,
        fileName
      } = fileChunk;
      data = data.toString().split(',')[1];
      const buffer = new Buffer.from(data, 'base64');
      // console.log(buffer, currentChunk)
      fs.appendFileSync('./uploads/'+fileName, buffer);

      if(currentChunk !== totalChunks - 1) {
        socket.emit('more-data', {
          fileName,
          nextChunk: currentChunk + 1
        })
      } else {
        let ext = fileName.split('.').pop();
        let newFileName = v4();
        fs.renameSync('./uploads/'+fileName, './uploads/'+ newFileName + '.' + ext);

        socket.emit('file-upload-complete', {
          fileName: newFileName,
          link: SERVER_URI + '/uploads/'+newFileName+'.'+ext
        })
      }
    });
  });
})

app.use(bodyParser.raw({type:'application/octet-stream', limit:'100mb'}));
app.use(cors({
  origin: 'http://localhost:3000',
}));


app.use('/', express.static('views'));
app.use('/uploads', express.static('uploads'));

app.post('/upload', (req, res) => {
  const {name,currentChunkIndex,totalChunks} = req.query;
  const firstChunk = parseInt(currentChunkIndex) === 0;
  const lastChunk = parseInt(currentChunkIndex) === parseInt(totalChunks) -1;
  const ext = name.split('.').pop();
  const data = req.body.toString().split(',')[1];
  console.log(data.length)
  const buffer = new Buffer(data, 'base64');
  const tmpFilename = 'tmp_' + md5(name + req.ip) + '.' + ext;
  if (firstChunk && fs.existsSync('./uploads/'+tmpFilename)) {
    fs.unlinkSync('./uploads/'+tmpFilename);
  }
  fs.appendFileSync('./uploads/'+tmpFilename, buffer);
  if (lastChunk) {
    const finalFilename = md5(Date.now()).substr(0, 6) + '.' + ext;
    fs.renameSync('./uploads/'+tmpFilename, './uploads/'+finalFilename);
    res.json({finalFilename});
  } else {
    res.json('ok');
  }
});

httpServer.listen(port, () => console.log(`server is running on port :: ${port}`));