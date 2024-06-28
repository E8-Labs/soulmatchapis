import express from "express";
const adminRouter = express.Router();
import {verifyJwtToken}  from "../middleware/jwtmiddleware.js";
import { GetUsers, AdminDashboard, deleteUserById, suspendUserById, 
    getReportedUsers, getBlockedUsers, IgnoreFlaggedUser } from "../controllers/admin.controller.js";



adminRouter.get("/users", verifyJwtToken, GetUsers);
adminRouter.get("/reported_users", verifyJwtToken, getReportedUsers);
adminRouter.post("/ignore_flagged", verifyJwtToken, IgnoreFlaggedUser);
adminRouter.get("/blocked_users", verifyJwtToken, getBlockedUsers);
adminRouter.get("/dashboard", verifyJwtToken, AdminDashboard);
adminRouter.post("/delete_user", verifyJwtToken, deleteUserById);
adminRouter.post("/suspend_user", verifyJwtToken, suspendUserById);


export default adminRouter;