import express from "express";
const mediaRouter = express.Router();
import {verifyJwtToken}  from "../middleware/jwtmiddleware.js";
import {UploadIntroVideos, UploadUserMedia,
    DeleteMedia, AnswerQuestion, DeleteIntroVideo} from '../controllers/video.controller.js'

    // console.log("Media router")
mediaRouter.post("/upload_intro_video", verifyJwtToken, UploadIntroVideos);
mediaRouter.post("/upload_user_media", verifyJwtToken, UploadUserMedia);
mediaRouter.post("/delete_media", verifyJwtToken, DeleteMedia);
mediaRouter.post("/delete_intro", verifyJwtToken, DeleteIntroVideo);

mediaRouter.post("/answer_question", verifyJwtToken, AnswerQuestion);
// journalRouter.get("/generate_snaps", fetchWeeklySnapshots);



export default mediaRouter;