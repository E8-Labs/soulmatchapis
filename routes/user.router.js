import express from "express";
const userRouter = express.Router();
import {verifyJwtToken}  from "../middleware/jwtmiddleware.js";
import {RegisterUser, LoginUser, GetUserProfile, UpdateProfile, 
    Discover, SocialLogin,
    SendPasswordResetEmail, ResetPassword, encrypt,  GetUserNotifications,
    SendEmailVerificationCode, VerifyEmailCode, CheckEmailExists,
    UploadIntroVideo, UploadUserMedia} from "../controllers/user.controller.js";
    import {UploadIntroVideoInVideoController} from '../controllers/video.controller.js'



userRouter.post("/register", RegisterUser);
userRouter.post("/login", LoginUser);
userRouter.post("/social_login", SocialLogin);
userRouter.post("/get_profile", verifyJwtToken, GetUserProfile);
userRouter.post("/update_profile", verifyJwtToken, UpdateProfile);
userRouter.get("/discover", verifyJwtToken, Discover);
userRouter.get("/notifications", verifyJwtToken, GetUserNotifications);
userRouter.post("/upload_intro_video", verifyJwtToken, UploadIntroVideoInVideoController);
userRouter.post("/upload_user_media", verifyJwtToken, UploadUserMedia);
userRouter.post("/send_reset_email", SendPasswordResetEmail);
userRouter.post("/update_password", ResetPassword);

userRouter.post("/send_verification_email", SendEmailVerificationCode);
userRouter.post("/verify_email", VerifyEmailCode);
userRouter.post("/email_exists", CheckEmailExists);
userRouter.post("/encrypt", encrypt);


export default userRouter;