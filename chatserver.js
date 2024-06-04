import { readFileSync } from "fs";
import { createServer } from "https";
import { Server } from "socket.io";

const httpsServer = createServer({
  key: readFileSync("/path/to/my/key.pem"),
  cert: readFileSync("/path/to/my/cert.pem")
});

const io = new Server(httpsServer, { /* options */ });

io.on("connection", (socket) => {
  // ...
});

httpsServer.listen(3000);