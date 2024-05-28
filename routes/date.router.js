import express from "express";
import multer from 'multer';
const dateRouter = express.Router();
import {verifyJwtToken}  from "../middleware/jwtmiddleware.js";
import { addDatePlace, listDatePlaces, addBooking } from "../controllers/date.controller.js";




dateRouter.post("/add_date_place", verifyJwtToken, addDatePlace);
dateRouter.post("/book_date", verifyJwtToken, addBooking);
dateRouter.get("/get_date_places", verifyJwtToken, listDatePlaces);



export default dateRouter