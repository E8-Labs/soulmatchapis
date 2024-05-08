import express from "express"
// const app = express()

const chatRouter = express.Router();

import {CreateChat, UpdateChat, SendMessage, GetMessages, GetChatsList} from "../controllers/chat.controller.js";
import verifyJwtToken from "../middleware/jwtmiddleware.js";
// const { verify } = require("jsonwebtoken");

chatRouter.post("/create_chat", verifyJwtToken, CreateChat);
chatRouter.post("/send_message", verifyJwtToken, SendMessage);
chatRouter.get("/get_messages", verifyJwtToken, GetMessages);
chatRouter.post("/update", verifyJwtToken, UpdateChat);
chatRouter.get("/chats_list", verifyJwtToken, GetChatsList);


export default chatRouter;
