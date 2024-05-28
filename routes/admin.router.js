import express from "express";
const adminRouter = express.Router();
import {verifyJwtToken}  from "../middleware/jwtmiddleware.js";
import { GetUsers, AdminDashboard, deleteUserById, suspendUserById } from "../controllers/admin.controller.js";



adminRouter.get("/users", verifyJwtToken, GetUsers);
adminRouter.get("/dashboard", verifyJwtToken, AdminDashboard);
adminRouter.get("/delete_user", verifyJwtToken, deleteUserById);
adminRouter.get("/suspend_user", verifyJwtToken, suspendUserById);


export default adminRouter;