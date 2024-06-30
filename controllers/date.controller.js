import db from "../models/index.js";
import S3 from "aws-sdk/clients/s3.js";
import JWT from "jsonwebtoken";
import bcrypt from 'bcryptjs';
import multer from "multer";
import path from "path";
import moment from "moment-timezone";
import axios from "axios";
import chalk from "chalk";
import nodemailer from 'nodemailer'

import crypto from 'crypto'
import BookingResource from "../resources/booking.resource.js";
import NotificationType from '../models/user/notificationtype.js'
import { createNotification } from "../utilities/notificationutility.js";
import { Sequelize } from "sequelize";
import DatePlaceModel from "../models/date/dateplace.model.js";
// import { fetchOrCreateUserToken } from "./plaid.controller.js";
// const fs = require("fs");
// var Jimp = require("jimp");
// require("dotenv").config();
const User = db.user;
const Op = db.Sequelize.Op;

const upload = multer({ storage: multer.memoryStorage() });

const s3 = new S3({
    accessKeyId: process.env.AccessKeyId,
    secretAccessKey: process.env.SecretAccessKey,
    region: process.env.Region
})


export const addDatePlace = (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (error) {
            return res.status(403).send({ status: false, message: 'Unauthenticated user', data: null });
        }

        const adminUserId = authData.user.id;

        try {
            const adminUser = await db.user.findByPk(adminUserId);
            if (!adminUser || adminUser.role !== 'admin') {
                return res.status(403).send({ status: false, message: 'You are not authorized to perform this action.' });
            }

            const { name, categoryId, minBudget, maxBudget, openTime, closeTime, address, latitude, longitude, description, city, state } = req.body;
            console.log("Params added date", { name, categoryId, minBudget, maxBudget, openTime, closeTime, address, latitude, longitude, description, city, state })
            // Upload image to AWS S3
            // return res.send({ status: false, message: 'Go back' });
            // return
            const file = req.file;
            const params = {
                Bucket: process.env.Bucket,
                Key: `date_places/${Date.now()}_`,
                Body: file.buffer,
                ContentDisposition: 'inline',
                ContentType: "image/jpeg"
            };

            s3.upload(params, async (err, data) => {
                if (err) {
                    console.error('Error uploading image:', err);
                    return res.status(500).send({ status: false, message: 'Failed to upload image.', error: err.message });
                }

                const imageUrl = data.Location;

                // Create a new date place record in the database
                let datePlace = await db.DatePlace.create({
                    name,
                    imageUrl,
                    CategoryId: categoryId,
                    minBudget,
                    maxBudget,
                    openTime,
                    closeTime,
                    address,
                    latitude,
                    longitude,
                    description,
                    city, 
                    state,
                    rating: 5
                });
                let Cat = await db.Category.findByPk(categoryId)
                let backData = {
                    id: datePlace.id,
                    name,
                    imageUrl,
                    CategoryId: categoryId,
                    minBudget,
                    maxBudget,
                    openTime,
                    closeTime,
                    address,
                    latitude,
                    longitude,
                    description,
                    city, 
                    state,
                    rating: 5,
                    Category: {name: Cat.name, id: Cat.id}
                }
                // datePlace.Category = {name: Cat.name, id: Cat.id};

                res.send({ status: true, message: 'Date place added successfully.', data: backData });
            });
        } catch (err) {
            console.error('Error adding date place:', err);
            res.status(500).send({ status: false, message: 'An error occurred while adding the date place.', error: err.message });
        }
    });
};


export const UpdateDatePlace = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (error) {
            return res.status(403).send({ status: false, message: 'Unauthenticated user', data: null });
        }

        const adminUserId = authData.user.id;

        try {
            const adminUser = await db.user.findByPk(adminUserId);
            if (!adminUser || adminUser.role !== 'admin') {
                return res.status(403).send({ status: false, message: 'You are not authorized to perform this action.' });
            }

            // const {  } = req.params;
            const { id, name, categoryId, minBudget, maxBudget, openTime, closeTime, address, latitude, longitude, description, city, state } = req.body;

            // Find the date place by ID
            const datePlace = await db.DatePlace.findByPk(id);

            if (!datePlace) {
                return res.status(404).send({ status: false, message: 'Date place not found.' });
            }

            // If a file is uploaded, upload it to AWS S3
            if (req.file) {
                const file = req.file;
                const params = {
                    Bucket: process.env.Bucket,
                    Key: `date_places/${Date.now()}_${file.originalname}`,
                    Body: file.buffer,
                    ContentDisposition: 'inline',
                    ContentType: file.mimetype
                };

                const data = await s3.upload(params).promise();
                datePlace.imageUrl = data.Location;
            }

            // Update the date place details
            datePlace.name = name || datePlace.name;
            datePlace.city = city || datePlace.city;
            datePlace.state = state || datePlace.state;
            datePlace.categoryId = categoryId || datePlace.categoryId;
            let Cat = await db.Category.findByPk(categoryId || datePlace.categoryId)
            datePlace.Category = {name: Cat.name, id: Cat.id};
            datePlace.minBudget = minBudget || datePlace.minBudget;
            datePlace.maxBudget = maxBudget || datePlace.maxBudget;
            datePlace.openTime = openTime || datePlace.openTime;
            datePlace.closeTime = closeTime || datePlace.closeTime;
            datePlace.address = address || datePlace.address;
            datePlace.latitude = latitude || datePlace.latitude;
            datePlace.longitude = longitude || datePlace.longitude;
            datePlace.description = description || datePlace.description;

            await datePlace.save();

            res.send({ status: true, message: 'Date place updated successfully.', data: datePlace });
        } catch (err) {
            console.error('Error updating date place:', err);
            res.status(500).send({ status: false, message: 'An error occurred while updating the date place.', error: err.message });
        }
    });
}



export const listDatePlaces = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (error) {
            return res.status(403).send({ status: false, message: 'Unauthenticated user', data: null });
        }

        const adminUserId = authData.user.id;
        const adminUser = await db.user.findByPk(adminUserId);
        let showAll = req.query.allPlaces || false; // Show all places

        try {
            let offset = 0;
            if (typeof req.query.offset !== 'undefined') {
                offset = parseInt(req.query.offset, 10);
            }

            const limit = 40;
            let searchQuery = {};

            if (req.query.search) {
                const searchTerm = req.query.search;
                searchQuery = {
                    [Op.or]: [
                        { description: { [Op.like]: `%${searchTerm}%` } },
                        { address: { [Op.like]: `%${searchTerm}%` } },
                        { name: { [Op.like]: `%${searchTerm}%` } }
                    ]
                };
            }

            if (req.query.category) {
                searchQuery.CategoryId = req.query.category;
            }

            if (req.query.city) {
                searchQuery.city = { [Op.like]: `%${req.query.city}%` };
            }

            if (req.query.state) {
                searchQuery.state = { [Op.like]: `%${req.query.state}%` };
            }

            if (req.query.minBudget) {
                searchQuery.minBudget = { [Op.lte]: parseFloat(req.query.minBudget) };
            }

            if (req.query.maxBudget) {
                searchQuery.maxBudget = { [Op.gte]: parseFloat(req.query.maxBudget) };
            }

            if (req.query.minRating) {
                searchQuery.minRating = { [Op.lte]: parseFloat(req.query.rating) };
            }

            if (req.query.maxRating) {
                searchQuery.maxRating = { [Op.gte]: parseFloat(req.query.rating) };
            }

            const datePlaces = await db.DatePlace.findAll({
                where: searchQuery,
                offset: offset,
                limit: limit,
                include: [
                    {
                        model: db.Category,
                        attributes: ['name', 'id']
                    }
                ]
            });

            if (adminUser.role === 'admin' || showAll) {
                res.send({ status: true, message: "Date places fetched successfully", data: datePlaces });
            } else {
                const userId = authData.user.id;
                let upcoming = null;

                try {
                    upcoming = await db.sequelize.query(`
                        SELECT 
                            b.id, b.date, b.time, b.numberOfGuests,
                            u.id as userId, u.first_name as userFirstName, u.last_name as userLastName, u.email as userEmail,
                            du.id as dateUserId, du.first_name as dateUserFirstName, du.last_name as dateUserLastName, du.email as dateUserEmail,
                            dp.id as datePlaceId, dp.name as datePlaceName, dp.address as datePlaceAddress
                        FROM Bookings b
                        INNER JOIN Users u ON b.userId = u.id
                        LEFT JOIN Users du ON b.dateUserId = du.id
                        INNER JOIN DatePlaces dp ON b.datePlaceId = dp.id
                        WHERE b.userId = :userId AND b.date >= CURDATE()
                        ORDER BY b.date ASC, b.time ASC
                    `, {
                        replacements: { userId: userId },
                        type: db.Sequelize.QueryTypes.SELECT
                    });
                } catch (err) {
                    console.error('Error fetching upcoming bookings:', err);
                }

                let upcomingDates = [];
                if (upcoming) {
                    upcomingDates = await BookingResource(upcoming);
                }
                res.send({ status: true, message: "Date places fetched successfully", data: { dateNights: datePlaces, recommended: datePlaces, upcoming: upcomingDates } });
            }
        } catch (err) {
            console.error('Error fetching date places:', err);
            res.status(500).send({ status: false, message: 'An error occurred while fetching date places', error: err.message });
        }
    });
};
export const addBooking = (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (error) {
            return res.status(403).send({ status: false, message: 'Unauthenticated user', data: null });
        }

        const userId = authData.user.id;
        const { datePlaceId, date, time, numberOfGuests, dateUserId } = req.body;

        try {
            // Create a new booking record in the database
            const booking = await db.Booking.create({
                userId,
                datePlaceId,
                date,
                time,
                numberOfGuests,
                dateUserId
            });
            let created = await createNotification(userId, dateUserId, booking.id, NotificationType.TypeDateInvite);
            res.send({ status: true, message: 'Booking added successfully.', data: booking });
        } catch (err) {
            console.error('Error adding booking:', err);
            res.status(500).send({ status: false, message: 'An error occurred while adding the booking.', error: err.message });
        }
    });
};

export const SendEmailInviteToDate = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (error) {
            return res.status(403).send({ status: false, message: 'Unauthenticated user', data: null });
        }

        const userId = authData.user.id;
        let time = req.body.time;
        let date = req.body.date;
        let guests = req.body.guests;

        let datePlaceId = req.body.datePlaceId;
        let place = await db.DatePlace.findByPk(datePlaceId);
        let email = req.body.email;
        let description = req.body.description;
        let user = await db.user.findByPk(userId)
        if (user) {
            //send email here
            // Create a transporter object using the default SMTP transport
            let transporter = nodemailer.createTransport({
                host: "smtp.gmail.com", // Replace with your mail server host
                port: 587, // Port number depends on your email provider and whether you're using SSL or not
                secure: false, // true for 465 (SSL), false for other ports
                auth: {
                    user: "salman@e8-labs.com", // Your email address
                    pass: "uzmvwsljflyqnzgu", // Your email password
                },
            });


            try {
                let mailOptions = {
                    from: 'Soulmatch" salman@e8-labs.com', // Sender address
                    to: email, // List of recipients
                    subject: "Date Invitation", // Subject line
                    // text: `${randomCode}`, // Plain text body
                    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Date Invitation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 50px auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding: 20px 0;
            background-color: #6050DC;
            color: white;
            border-radius: 8px 8px 0 0;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 20px;
        }
        .content p {
            font-size: 16px;
            line-height: 1.6;
            color: #333333;
        }
        .content h4 {
            font-size: 18px;
            color: #007BFF;
            margin-bottom: 10px;
        }
        .footer {
            text-align: center;
            padding: 20px;
            font-size: 14px;
            color: #777777;
        }
        .footer a {
            color: #007BFF;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Date Invitation</h1>
        </div>
        <div class="content">
            <p>Hello there!</p>
            <p><strong>${user.first_name}</strong> has invited you to a date.</p>
            <p><b>Comments:</b>${description}</p>
            <br/>
            <h4>Date Location</h4>
            <br/>
            <p><b>Time:</b> ${time}</p>
            <p><b>Date:</b> ${date}</p>
            <p><b>Guests:</b> ${guests}</p>
        </div>
        <div class="footer">
            <p>Thank you for using our service. If you have any questions, please <a href="mailto:support@example.com">contact us</a>.</p>
        </div>
    </div>
</body>
</html>

`, // HTML body
                };
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        res.send({ status: false, message: "Invite not sent" })
                        ////console.log(error);
                    }
                    else {
                        res.send({ status: true, message: "Invite sent" })
                    }
                });
            }
            catch (error) {
                //console.log("Exception email Invite Date", error)
                res.send({ status: true, message: "Invite not sent", error: error })
            }
        }
        else {
            res.send({ status: false, data: null, message: "No such user" })
        }

    })

}



// Function to add a category
export const addCategory = (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (error) {
            return res.status(403).send({ status: false, message: 'Unauthenticated user', data: null });
        }

        const { name } = req.body;

        try {
            const category = await db.Category.create({ name });
            res.send({ status: true, message: 'Category added successfully.', data: category });
        } catch (err) {
            console.error('Error adding category:', err);
            res.status(500).send({ status: false, message: 'An error occurred while adding the category.', error: err.message });
        }
    });
};


export const loadCategories = async (req, res) => {
    try {
        const categories = await db.Category.findAll();
        res.send({ status: true, message: 'Categories fetched successfully.', data: categories });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).send({ status: false, message: 'An error occurred while fetching categories.', error: err.message });
    }
};


// Function to delete a Date Place
export const deleteDatePlace = (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (error) {
            return res.status(403).send({ status: false, message: 'Unauthenticated user', data: null });
        }

        const { id } = req.body;

        try {

            const resultBooking = await db.Booking.destroy({ where: { datePlaceId: id } });
            const result = await db.DatePlace.destroy({ where: { id } });
            if (result) {
                res.send({ status: true, message: 'Date place deleted successfully.' });
            } else {
                res.send({ status: false, message: 'Date place not found.' });
            }
        } catch (err) {
            console.error('Error deleting Date Place:', err);
            res.status(500).send({ status: false, message: 'An error occurred while deleting the Date Place.', error: err.message });
        }
    });
};

// Function to delete a category
export const deleteCategory = (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (error) {
            return res.status(403).send({ status: false, message: 'Unauthenticated user', data: null });
        }

        const { id } = req.params;

        try {
            const result = await db.Category.destroy({ where: { id } });

            if (result) {
                res.send({ status: true, message: 'Category deleted successfully.' });
            } else {
                res.send({ status: false, message: 'Category not found.' });
            }
        } catch (err) {
            console.error('Error deleting category:', err);
            res.status(500).send({ status: false, message: 'An error occurred while deleting the category.', error: err.message });
        }
    });
};