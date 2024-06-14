import db from "../models/index.js";
import S3 from "aws-sdk/clients/s3.js";
import JWT from "jsonwebtoken";
import bcrypt from 'bcrypt';
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

            const { name, categoryId, minBudget, maxBudget, openTime, closeTime, address, latitude, longitude, description } = req.body;

            // Upload image to AWS S3
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
                const datePlace = await db.DatePlace.create({
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
                    description
                });

                res.send({ status: true, message: 'Date place added successfully.', data: datePlace });
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
            const { id, name, categoryId, minBudget, maxBudget, openTime, closeTime, address, latitude, longitude, description } = req.body;

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
            datePlace.categoryId = categoryId || datePlace.categoryId;
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
                        { address: { [Op.like]: `%${searchTerm}%` } }
                    ]
                };
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
            if (adminUser.role === 'admin') {
                res.send({ status: true, message: "Date places fetched successfully", data: datePlaces });
            }
            else {
                const userId = authData.user.id;
                let upcoming = null;
                console.log("FInding upcoming dates ", userId)
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
                    console.log("Upcoming ", upcoming)
                    // upcoming = upcomingDates;
                    // res.send({ status: true, message: 'Upcoming bookings fetched successfully.', data: upcomingBookings });
                } catch (err) {
                    console.error('Error fetching upcoming bookings:', err);
                    // res.status(500).send({ status: false, message: 'An error occurred while fetching upcoming bookings.', error: err.message });
                }

                let upcomingDates = [];
                if(upcoming){
                    upcomingDates = await BookingResource(upcoming);
                }
                res.send({ status: true, message: "Date places fetched successfully", data: { dateNights: datePlaces, recommended: datePlaces, upcoming: upcomingDates } });
            }


        } catch (err) {
            console.error('Error fetching date places:', err);
            res.status(500).send({ status: false, message: 'An error occurred while fetching date places', error: err.message });
        }
    })

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
            const result = await db.Booking.destroy({ where: { id } });

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