import express from "express";
import multer from 'multer';
const userRouter = express.Router();
import {verifyJwtToken}  from "../middleware/jwtmiddleware.js";
import {RegisterUser, LoginUser, GetUserProfile, UpdateProfile, 
    Discover, SocialLogin, LikeProfile, GetProfilesWhoLikedMe, FindAllMyMatches,
    SendPasswordResetEmail, ResetPassword, encrypt,  GetUserNotifications,
    SendEmailVerificationCode, VerifyEmailCode, CheckEmailExists, AllQuestions, AddQuestion,
    UploadIntroVideo, UploadUserMedia, getUserNotifications, ChangenUserPassword, 
    DeleteAllLikesAndMatches, UpdateProfileHeights, SendEmailFeedback, ReportUser, blockUser, DeleteAnswer} from "../controllers/user.controller.js";

    import {UploadIntroVideoInVideoController, UploadIntroVideos} from '../controllers/video.controller.js'




userRouter.post("/register", RegisterUser);
userRouter.post("/login", LoginUser);
userRouter.post("/social_login", SocialLogin);
userRouter.get("/get_profile", verifyJwtToken, GetUserProfile);

userRouter.post("/report_user", verifyJwtToken, ReportUser);
userRouter.post("/send_feedback", verifyJwtToken, SendEmailFeedback);

userRouter.post("/block_user", verifyJwtToken, blockUser);
userRouter.post("/delete_answer", verifyJwtToken, DeleteAnswer);

userRouter.post("/update_profile", verifyJwtToken, UpdateProfile);
userRouter.post("/update_all_heights", verifyJwtToken, UpdateProfileHeights);
userRouter.post("/discover", verifyJwtToken, Discover);
userRouter.post("/reset_profile", verifyJwtToken, DeleteAllLikesAndMatches);
userRouter.get("/my_matches", verifyJwtToken, FindAllMyMatches);
userRouter.get("/notifications", verifyJwtToken, GetUserNotifications);

userRouter.get("/questions", verifyJwtToken, AllQuestions);
userRouter.post("/add_question", AddQuestion);

userRouter.post("/upload_intro_video", verifyJwtToken, UploadIntroVideos);
// userRouter.post("/upload_user_media", verifyJwtToken, UploadUserMedia);
userRouter.post("/send_reset_email", SendPasswordResetEmail);
userRouter.post("/update_password", ResetPassword);
userRouter.post("/like_profile", verifyJwtToken, LikeProfile);
userRouter.get("/get_profile_likes", verifyJwtToken, GetProfilesWhoLikedMe);
userRouter.post("/send_verification_email", SendEmailVerificationCode);
userRouter.post("/verify_email", VerifyEmailCode);
userRouter.post("/email_exists", CheckEmailExists);
userRouter.post("/encrypt", encrypt);

userRouter.get("/get_notifications", verifyJwtToken, getUserNotifications);


userRouter.post("/change_password", verifyJwtToken, ChangenUserPassword);
export default userRouter;