import express from "express";
import multer from 'multer';
const dateRouter = express.Router();
import {verifyJwtToken}  from "../middleware/jwtmiddleware.js";
import { addDatePlace, listDatePlaces, addBooking, addCategory, deleteCategory, loadCategories, deleteDatePlace,
    UpdateDatePlace, SendEmailInviteToDate, AddReview, GetDatePlace } from "../controllers/date.controller.js";




dateRouter.post("/add_date_place", verifyJwtToken, addDatePlace);
dateRouter.post("/book_date", verifyJwtToken, addBooking);
dateRouter.post("/review_date_place", verifyJwtToken, AddReview);
dateRouter.post("/add_category", verifyJwtToken, addCategory);
dateRouter.post("/delete_category", verifyJwtToken, deleteCategory);
dateRouter.post("/delete_date_place", verifyJwtToken, deleteDatePlace);
dateRouter.post("/book_date", verifyJwtToken, addBooking);
dateRouter.post("/invite_to_date_email", verifyJwtToken, SendEmailInviteToDate);
dateRouter.post("/update_date_place", verifyJwtToken, UpdateDatePlace);

dateRouter.get("/get_categories", verifyJwtToken, loadCategories);
dateRouter.get("/get_date_places", verifyJwtToken, listDatePlaces);
dateRouter.get("/get_date_detail", verifyJwtToken, GetDatePlace);



export default dateRouter