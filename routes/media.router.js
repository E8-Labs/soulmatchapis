import express from "express";
const mediaRouter = express.Router();
import {verifyJwtToken}  from "../middleware/jwtmiddleware.js";
import {UploadIntroVideoInVideoController, UploadIntroVideos, UploadUserMedia,
    DeleteMedia} from '../controllers/video.controller.js'

mediaRouter.post("/upload_intro_video", verifyJwtToken, UploadIntroVideos);
mediaRouter.post("/upload_user_media", verifyJwtToken, UploadUserMedia);
mediaRouter.post("/delete_media", verifyJwtToken, DeleteMedia);


// journalRouter.get("/generate_snaps", fetchWeeklySnapshots);



export default mediaRouter;