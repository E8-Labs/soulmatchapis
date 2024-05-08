import express from "express";
const adminRouter = express.Router();
import {verifyJwtToken}  from "../middleware/jwtmiddleware.js";
import { GetUsers, AdminDashboard } from "../controllers/admin.controller.js";



adminRouter.get("/users", verifyJwtToken, GetUsers);
adminRouter.get("/dashboard", verifyJwtToken, AdminDashboard);


export default adminRouter;