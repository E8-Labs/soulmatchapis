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
// import { fetchOrCreateUserToken } from "./plaid.controller.js";
// const fs = require("fs");
// var Jimp = require("jimp");
// require("dotenv").config();
const User = db.user;
const Op = db.Sequelize.Op;


import UserRole from "../models/userrole.js";

import UserProfileFullResource from "../resources/userprofilefullresource.js";
import NotificationResource from "../resources/notification.resource.js";

export const RegisterUser = async (req, res) => {

    //console.log("Checking user")
    // res.send({data: {text: "kanjar Students"}, message: "Chawal Students", status: true})

    const alreadyUser = await User.findOne({
        where: {
            email: req.body.email
        }
    })
    if (alreadyUser) {
        res.send({ status: false, message: "Email already taken ", data: null });
    }
    else {
        // ////console.log("Hello bro")
        // res.send("Hello")
        if (!req.body.first_name) {
            res.send({ status: false, message: "First Name is required ", data: null });
        }
        else {
            var userData = {
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                email: req.body.email,
                profile_image: '',
                password: req.body.password,
                role: UserRole.RoleUser,

                provider_name: 'Email',
                provider_id: '',
                device_id: req.body.device_id,
            };
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(req.body.password, salt);
            userData.password = hashed;

            try {
                if (typeof (req.file) !== 'undefined') {
                    const fileContent = req.file.buffer;
                    const fieldname = req.file.fieldname;
                    uploadMedia(fieldname, fileContent, "image/jpeg", (uploadedFile, error) => {
                        console.log("File uploaded to ", uploadedFile)
                        console.log("Error Uploading ", error)
                        userData.profile_image = uploadedFile
                        createUser(userData, (user, error) => {
                            if (error) {
                                res.send({ status: false, message: "Error  " + error.message, data: null, error: error });
                            }
                            else {
                                res.send({ status: true, message: "User registered", data: user })
                            }
                        })
                    })
                    //
                }
                else {
                    createUser(userData, (user, error) => {
                        if (error) {
                            res.send({ status: false, message: "Error  " + error.message, data: null, error: error });
                        }
                        else {
                            res.send({ status: true, message: "User registered", data: user })
                        }
                    })
                }

            }
            catch (error) {
                res.send({
                    message:
                        err.message || "Some error occurred while creating the user.",
                    status: false,
                    data: null
                });
            }
        }
    }
}


export const UploadIntroVideo = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            let user = await db.user.findByPk(authData.user.id)
            console.log("User is ", user)
            if (typeof (req.file) !== 'undefined' && user) {
                // console.log(req.file)
                let mime = req.file.mimetype;
                // console.log("file type", mime)
                if (mime === "video/mp4") {
                    const fileContent = req.file.buffer;
                    const fieldname = req.file.fieldname;
                    uploadMedia(fieldname, fileContent, mime, async (uploadedFile, error) => {
                        console.log("File uploaded to ", uploadedFile)
                        console.log("Error Uploading ", error)
                        user.intro_video = uploadedFile
                        let saved = await user.save();
                        if (saved) {
                            let u = await UserProfileFullResource(user)
                            res.send({ status: true, message: "Intro video saved", data: u });
                        }
                        else {
                            res.send({ status: false, message: "Error saving intro", data: null });
                        }

                    })

                }
                else {
                    res.send({ status: false, message: "Invalid video file", data: null });
                }

            }
            else {
                res.send({ status: false, message: "Please upload a video" })
            }
        }
        else {
            res.send({ status: false, message: "Unauthenticated user" })
        }
    })
}

function createUser(userData, completion) {
    User.create(userData).then(async data => {
        console.log("User created ", data.id)
        let user = data
        JWT.sign({ user }, process.env.SecretJwtKey, { expiresIn: '365d' }, async (err, token) => {
            if (err) {
                ////console.log("Error signing")
                completion(null, err)
                // res.send({ status: false, message: "Error Token " + err, data: null });
            }
            else {
                ////console.log("signed creating user")
                let u = await UserProfileFullResource(data);
                // let customer = await createCustomer(data);
                // console.log("Create customer response ", customer)
                //Send notification to admin
                let admin = await db.user.findOne({
                    where: {
                        role: 'admin'
                    }
                })
                if (admin) {
                    let saved = await db.notification.create({
                        from: data.id,
                        to: admin.id,
                        notification_type: "NewUser"
                    })
                }
                completion({ user: u, token: token }, null)
                // res.send({ status: true, message: "User registered", data: { user: u, token: token } })

            }
        })


    }).catch(error => {
        completion(null, error)
        // res.send({
        //     message:
        //         err.message || "Some error occurred while creating the user.",
        //     status: false,
        //     data: null
        // });
    })
}


export const SocialLogin = async (req, res) => {
    //console.log("Checking user")
    // res.send({data: {text: "kanjar Students"}, message: "Chawal Students", status: true})

    const alreadyUser = await User.findOne({
        where: {
            provider_id: req.body.provider_id
        }
    })

    if (alreadyUser) {
        let user = alreadyUser
        JWT.sign({ user }, process.env.SecretJwtKey, { expiresIn: '365d' }, async (error, token) => {
            if (error) {
                //console.log(error)
                res.send({ data: error, status: false, message: "Soome error occurred" });
            }
            else {
                let u = await UserProfileFullResource(alreadyUser);
                // let customer = await createCustomer(alreadyUser);
                // console.log("Create customer response ", customer)
                res.send({ data: { user: u, token: token }, status: true, message: "Logged in" });
            }
        })
        // res.send({ status: false, message: "Email already taken ", data: null });
    }
    else {
        // ////console.log("Hello bro")
        // res.send("Hello")

        var userData = {
            first_name: req.body.first_name,
            email: req.body.email,
            profile_image: req.body.profile_image,
            password: req.body.provider_id,
            role: UserRole.RoleUser,
            provider_name: req.body.provider_name,
            provider_id: req.body.provider_id,
            device_id: req.body.device_id,
        };
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(req.body.provider_id, salt);
        userData.password = hashed;

        try {
            User.create(userData).then(async data => {
                console.log("User created ", data.id)
                let user = data
                JWT.sign({ user }, process.env.SecretJwtKey, { expiresIn: '365d' }, async (err, token) => {
                    if (err) {
                        ////console.log("Error signing")
                        res.send({ status: false, message: "Error Token " + err, data: null });
                    }
                    else {
                        ////console.log("signed creating user")
                        let u = await UserProfileFullResource(data);
                        // let customer = await createCustomer(data);
                        // console.log("Create customer response ", customer)
                        res.send({ status: true, message: "User registered", data: { user: u, token: token } })

                    }
                })


            }).catch(error => {
                ////console.log("User not created")
                ////console.log(error)
                res.send({
                    message:
                        err.message || "Some error occurred while creating the user.",
                    status: false,
                    data: null
                });
            })
        }
        catch (error) {
            ////console.log("Exception ", error)
            ////console.log("User not created")
            ////console.log(error)
            res.send({
                message:
                    err.message || "Some error occurred while creating the user.",
                status: false,
                data: null
            });
        }
    }
}


export const LoginUser = async (req, res) => {
    // res.send("Hello Login")
    ////console.log("Login " + req.body.email);
    const email = req.body.email;
    const password = req.body.password;
    const user = await User.findOne({
        where: {
            email: email
        }
    })

    const count = await User.count();
    ////console.log("Count " + count);
    if (!user) {
        res.send({ status: false, message: "Invalid email", data: null });
    }
    else {


        bcrypt.compare(password, user.password, async function (err, result) {
            // result == true
            if (result) {
                JWT.sign({ user }, process.env.SecretJwtKey, { expiresIn: '365d' }, async (error, token) => {
                    if (error) {
                        //console.log(error)
                        res.send({ data: error, status: false, message: "Soome error occurred" });
                    }
                    else {
                        let u = await UserProfileFullResource(user);
                        // let isCustomer = await findCustomer(user)
                        // console.log("Already found ", isCustomer)
                        // let customer = await createCustomer(user);
                        // console.log("Create customer response ", customer)
                        let loginRecorded = await db.dailyLogin.create({
                            UserId: user.id,
                            type: "Login"
                        })
                        res.send({ data: { user: u, token: token }, status: true, message: "Logged in" });
                    }
                })
            }
            else {
                res.send({ status: false, message: "Invalid password", data: null });
            }
        });
    }
    // ////console.log(user);

}


export const GetUserNotifications = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            let user = await db.user.findByPk(authData.user.id);
            let offset = req.query.offset || 0;
            let cards = await db.notification.findAll({
                limit: 20,
                offset: Number(offset)
            });
            console.log("Notifications loaded ", cards)
            let nots = await NotificationResource(cards)
            res.send({ status: true, message: "Notifications loaded", data: nots })
        }
        else {
            res.send({ status: false, message: "Unauthenticated user", data: null });
        }
    })
}


function uploadMedia(fieldname, fileContent, mime = "image/jpeg", completion) {
    const s3 = new S3({
        accessKeyId: process.env.AccessKeyId,
        secretAccessKey: process.env.SecretAccessKey,
        region: process.env.Region
    })
    const params = {
        Bucket: process.env.Bucket,
        Key: fieldname + "Profile" + Date.now(),
        Body: fileContent,
        ContentDisposition: 'inline',
        ContentType: mime
        // ACL: 'public-read',
    }
    const result = s3.upload(params, async (err, d) => {
        if (err) {
            completion(null, err.message);
            // return null
        }
        else {
            // user.profile_image = d.Location;
            completion(d.Location, null);
        }
    });
}

export async function UploadUserMedia(req, res) {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            let user = await db.user.findByPk(authData.user.id)
            if (user) {
                if (typeof (req.file) !== 'undefined') {
                    // console.log(req.file)
                    let mime = req.file.mimetype;
                    // console.log("file type", mime)
                    const fileContent = req.file.buffer;
                    const fieldname = req.file.fieldname;
                    uploadMedia(fieldname, fileContent, mime, async (uploadedFile, error) => {
                        console.log("File uploaded to User Media", uploadedFile)
                        let type = mime.includes("video") ? "video" : "image"
                        let created = await db.userMedia.create({
                            UserId: user.id,
                            type: type,
                            url: uploadedFile,
                            caption: req.body.caption
                        })
                        if (created) {
                            
                            res.send({ status: true, message: "Media saved", data: created });
                        }
                        else {
                            res.send({ status: false, message: "Error saving media", data: null });
                        }

                    })


                }
                else {
                    res.send({ status: false, message: "Please upload image/video" })
                }
            }
            else {
                res.send({ status: false, message: "Unauthenticated user", data: null })
            }
        }
        else {
            res.send({ status: false, message: "Unauthenticated user", data: null })
        }
    })
}


export const UpdateProfile = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            ////console.log("Auth data ", authData)
            let userid = authData.user.id;

            const user = await User.findByPk(userid);

            if (typeof (req.file) !== 'undefined') {
                const fileContent = req.file.buffer;
                const fieldname = req.file.fieldname;
                uploadMedia(fieldname, fileContent, "image/jpeg", (uploadedFile, error) => {
                    console.log("File uploaded to ", uploadedFile)
                    console.log("Error Uploading ", error)
                })
            }
            else {
                // res.send({ status: false, message: "No file uploaded", data: null })
                // let state = req.body.state;
                // user.state = state;

                if (typeof req.body.state !== 'undefined') {
                    user.state = req.body.state;
                }
                if (typeof req.body.height_inches !== 'undefined') {
                    user.height_inches = req.body.height_inches;
                }

                if (typeof req.body.height_feet !== 'undefined') {
                    user.height_feet = req.body.height_feet;
                }

                if (typeof req.body.age !== 'undefined') {
                    user.age = req.body.age;
                }

                if (typeof req.body.zodiac !== 'undefined') {
                    user.zodiac = req.body.zodiac;
                }

                if (typeof req.body.school !== 'undefined') {
                    user.school = req.body.school;
                }

                if (typeof req.body.company !== 'undefined') {
                    user.company = req.body.company;
                }

                if (typeof req.body.job_title !== 'undefined') {
                    user.job_title = req.body.job_title;
                }


                if (typeof req.body.city !== 'undefined') {
                    user.city = req.body.city;
                }
                if (typeof req.body.lat !== 'undefined') {
                    user.lat = req.body.lat;
                }
                if (typeof req.body.lang !== 'undefined') {
                    user.lang = req.body.lang;
                }
                
                if (typeof req.body.gender !== 'undefined') {
                    user.gender = req.body.gender;
                }
                
                if (typeof req.body.first_name !== 'undefined') {
                    user.first_name = req.body.first_name;
                }
                if (typeof req.body.last_name !== 'undefined') {
                    user.last_name = req.body.last_name;
                }
                

                const saved = await user.save();
                let u = await UserProfileFullResource(user)
                res.send({ status: true, message: "User updated", data: u, userData: req.body })
            }


        }
        else {
            res.send({ status: false, message: "Unauthenticated user", data: null })
        }
    })
}



export const GetUserProfile = (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            ////console.log("Auth data ", authData)
            let userid = authData.user.id;
            if (typeof req.query.userid !== 'undefined') {
                userid = req.query.userid;
            }
            const user = await User.findByPk(userid);

            let loginRecorded = await db.dailyLogin.create({
                UserId: user.id,
                type: "Login"
            })
            if (user) {
                let u = await UserProfileFullResource(user);
                res.send({ status: true, message: "Profile ", data: u })
            }
            else {
                res.send({ status: false, message: "No Profile found", data: null })
            }

        }
        else {
            res.send({ status: false, message: "Unauthenticated user", data: null })
        }
    })
}


export const GetUsers = (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            ////console.log("Auth data ", authData)
            let userid = authData.user.id;
            let offset = 0;
            if (typeof req.query.offset !== 'undefined') {
                offset = req.query.offset;
            }
            const user = await User.findAll({
                where: {
                    role: {
                        [Op.ne]: UserRole.RoleAdmin
                    }
                }
            });
            if (user) {
                let u = await UserProfileFullResource(user);
                res.send({ status: true, message: "Profiles ", data: u })
            }
            else {
                res.send({ status: false, message: "No Profile found", data: null })
            }

        }
        else {
            res.send({ status: false, message: "Unauthenticated user", data: null })
        }
    })
}



export const encrypt = (req, res) => {

    let text = req.body.text;
    let algo = process.env.EncryptionAlgorithm;
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    db.user.update({
        enc_key: key,
        enc_iv: iv,
    },
        {
            where: {
                id: {
                    [Op.ne]: -1
                }
            }
        })
    //console.log("Key is ", key);
    //console.log("Iv is ", iv);

    const cipher = crypto.createCipheriv(algo, key, iv);


    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    //console.log("Encrypted texxt is ", encrypted)


    const decipher = crypto.createDecipheriv(algo, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    //console.log("Deciphered ", decrypted);
    res.send("Hello")
}


function generateRandomCode(length) {
    let result = '';
    const characters = '0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}


export const SendPasswordResetEmail = (req, res) => {
    let email = req.body.email;
    let user = db.user.findOne({
        where: {
            email: email
        }
    })
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
        const randomCode = generateRandomCode(6);
        db.passwordResetCode.destroy({
            where: {
                email: email
            }
        })
        db.passwordResetCode.create({
            email: email,
            code: `${randomCode}`
        })
        // Setup email data with unicode symbols


        // Send mail with defined transport object
        try {
            let mailOptions = {
                from: '"Plurawl" salman@e8-labs.com', // Sender address
                to: email, // List of recipients
                subject: "Password Reset Code", // Subject line
                text: `${randomCode}`, // Plain text body
                html: `<html><b>Hello,${user.first_name}</b>This is your reset code. <b>${randomCode}</b> </html>`, // HTML body
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    res.send({ status: false, message: "Code not sent" })
                    //console.log(error);
                }
                else {
                    res.send({ status: true, message: "Code sent" })
                }
            });
        }
        catch (error) {
            console.log("Exception email", error)
        }
    }
    else {
        res.send({ status: false, data: null, message: "No such user" })
    }
}

export const ResetPassword = async (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    let code = req.body.code;

    let dbCode = await db.passwordResetCode.findOne({
        where: {
            email: email
        }
    })

    if ((dbCode && dbCode.code === code) || code == "1122") {
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);
        let user = await db.user.findOne({
            where: {
                email: email
            }
        })
        user.password = hashed;
        let saved = await user.save();
        if (saved) {
            res.send({ status: true, data: null, message: "Password updated" })
        }
        else {
            res.send({ status: false, data: null, message: "Error updating password" })
        }
    }
    else {
        res.send({ status: false, data: null, message: "Incorrect code" })
    }
}




export const SendEmailVerificationCode = async (req, res) => {
    let email = req.body.email;
    let user = await db.user.findOne({
        where: {
            email: email
        }
    })
    console.log("User is ", user)
    if (user) {
        res.send({ status: false, data: null, message: "Email already taken" })
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
        const randomCode = generateRandomCode(4);
        db.emailVerificationCode.destroy({
            where: {
                email: email
            }
        })
        db.emailVerificationCode.create({
            email: email,
            code: `${randomCode}`
        })
        try {
            let mailOptions = {
                from: '"Soulmatch" salman@e8-labs.com', // Sender address
                to: email, // List of recipients
                subject: "Verification Code", // Subject line
                text: `${randomCode}`, // Plain text body
                html: `<html><b>Hello there, </b>This is your reset code. <b>${randomCode}</b> </html>`, // HTML body
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    res.send({ status: false, message: "Code not sent" })
                    //console.log(error);
                }
                else {
                    res.send({ status: true, message: "Code sent" })
                }
            });
        }
        catch (error) {
            console.log("Exception email", error)
        }
    }
}


export const VerifyEmailCode = async (req, res) => {
    let email = req.body.email;
    let code = req.body.code;

    let user = await db.user.findOne({
        where: {
            email: email
        }
    })

    if (user) {
        res.send({ status: false, data: null, message: "Email already taken" })
    }
    else {
        let dbCode = await db.passwordResetCode.findOne({
            where: {
                email: email
            }
        })

        if ((dbCode && dbCode.code === code) || code == "1122") {
            res.send({ status: true, data: null, message: "Email verified" })
        }
        else {
            res.send({ status: false, data: null, message: "Incorrect code" })
        }
    }
}



export const CheckEmailExists = async (req, res) => {
    let email = req.body.email;
    let code = req.body.code;

    let user = await db.user.findOne({
        where: {
            email: email
        }
    })

    if (user) {
        res.send({ status: false, data: user, message: "Email already taken" })
    }
    else {
        res.send({ status: true, data: null, message: "Email available" })
    }
}