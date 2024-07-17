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
// import { fetchOrCreateUserToken } from "./plaid.controller.js";
// const fs = require("fs");
// var Jimp = require("jimp");
// require("dotenv").config();
const User = db.user;
const Op = db.Sequelize.Op;

export const SendUserSuspendedDeletedEmail = async (data) => {
    let user = data.user;
    console.log("User is ", user)
    if (!user) {
        return null
        // res.send({ status: false, data: null, message: "Email already taken" })
    }
    else {

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
                from: '"Soulmatch" salman@e8-labs.com', // Sender address
                to: "salmanmajid14@gmail.com",//email, // List of recipients
                subject: `Account ${data.type}`, // Subject line
                // text: `${randomCode}`, // Plain text body
                html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Code</title>
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
            text-align: center;
        }
        .content p {
            font-size: 16px;
            line-height: 1.6;
            color: #333333;
        }
        .content .code {
            display: inline-block;
            margin: 20px 0;
            padding: 10px 20px;
            font-size: 24px;
            font-weight: bold;
            color: #ffffff;
            background-color: #6050DC;
            border-radius: 4px;
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
            <h1>Email Notification</h1>
        </div>
        <div class="content">
            <p><strong>Hello ${user.first_name}!</strong></p>
            <p>Your account has been ${data.type} by admin. Please take necessary precautions. If you have active subscriptions, cancel them through your apple id account from the settings.</p>
            
        </div>
        <div class="footer">
            <p>If you think this was a mistake or if you have any questions, please <a href="mailto:salman@e8-labs.com">contact us</a>.</p>
        </div>
    </div>
</body>
</html>
`, // HTML body
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return null
                    res.send({ status: false, message: "Code not sent" })
                    ////console.log(error);
                }
                else {
                    return { status: true, message: "Code sent" }
                    res.send({ status: true, message: "Code sent" })
                }
            });
        }
        catch (error) {
            
            console.log("Exception email", error)
            return null
        }
    }
}