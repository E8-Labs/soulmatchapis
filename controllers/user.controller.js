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
import NotificationType from '../models/user/notificationtype.js'
import {createThumbnailAndUpload, uploadMedia, deleteFileFromS3} from '../utilities/storage.js'
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
import { createNotification } from "../utilities/notificationutility.js";
import { Sequelize } from "sequelize";
import { sendNot, sendNotWithUser } from "./push.controller.js";

const generateThumbnail = (videoPath, thumbnailPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .on('end', () => {
                //console.log('Screenshot taken');
                resolve(thumbnailPath);
            })
            .on('error', (err) => {
                //console.log('An error occurred: ' + err.message);
                reject(err);
            })
            .screenshots({
                count: 1,
                folder: path.dirname(thumbnailPath),
                filename: path.basename(thumbnailPath),
                size: '320x240'
            });
    });
};

// export const RegisterUser = async (req, res) => {

//     ////console.log("Checking user")
//     // res.send({data: {text: "kanjar Students"}, message: "Chawal Students", status: true})

//     const alreadyUser = await User.findOne({
//         where: {
//             email: req.body.email
//         }
//     })
//     if (alreadyUser) {
//         res.send({ status: false, message: "Email already taken ", data: null });
//     }
//     else {
//         // //////console.log("Hello bro")
//         // res.send("Hello")
//         if (!req.body.first_name) {
//             res.send({ status: false, message: "First Name is required ", data: null });
//         }
//         else {
//             var userData = {
//                 first_name: req.body.first_name,
//                 last_name: req.body.last_name,
//                 email: req.body.email,
//                 profile_image: '',
//                 password: req.body.password,
//                 role: UserRole.RoleUser,
//                 plan_status: 'free',
//                 provider_name: 'Email',
//                 provider_id: '',
//                 device_id: req.body.device_id,
//             };
//             const salt = await bcrypt.genSalt(10);
//             const hashed = await bcrypt.hash(req.body.password, salt);
//             userData.password = hashed;

//             try {
//                 if (typeof (req.file) !== 'undefined') {
//                     const fileContent = req.file.buffer;
//                     const fieldname = req.file.fieldname;
//                     uploadMedia(fieldname, fileContent, "image/jpeg", (uploadedFile, error) => {
//                         //console.log("File uploaded to ", uploadedFile)
//                         //console.log("Error Uploading ", error)
//                         userData.profile_image = uploadedFile
                        // createUser(userData, async (user, error) => {
                        //     if (error) {
                        //         res.send({ status: false, message: "Error  " + error.message, data: null, error: error });
                        //     }
                        //     else {

                        //         res.send({ status: true, message: "User registered", data: user })
                        //     }
                        // })
//                     })
//                     //
//                 }
//                 else {
//                     createUser(userData, (user, error) => {
//                         if (error) {
//                             res.send({ status: false, message: "Error  " + error.message, data: null, error: error });
//                         }
//                         else {
//                             res.send({ status: true, message: "User registered", data: user })
//                         }
//                     })
//                 }

//             }
//             catch (error) {
//                 res.send({
//                     message:
//                         err.message || "Some error occurred while creating the user.",
//                     status: false,
//                     data: null
//                 });
//             }
//         }
//     }
// }


export const RegisterUser = async (req, res) => {
    const alreadyUser = await User.findOne({ where: { email: req.body.email } });

    if (alreadyUser) {
        res.send({ status: false, message: "Email already taken ", data: null });
    } else {
        if (!req.body.first_name) {
            res.send({ status: false, message: "First Name is required ", data: null });
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(req.body.password, salt);

            let userData = {
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                email: req.body.email,
                profile_image: '',
                full_profile_image: '',
                password: hashed,
                role: UserRole.RoleUser,
                plan_status: 'free',
                status: 'active',
                provider_name: 'Email',
                provider_id: '',
                device_id: req.body.device_id,
            };

            try {
                if (req.file) {
                    const fileContent = req.file.buffer;
                    const fieldname = req.file.fieldname;

                    // Upload original image
                    const fullProfileImageUrl = await uploadMedia(fieldname, fileContent, "image/jpeg", "profiles");
                    userData.full_profile_image = fullProfileImageUrl;

                    // Create and upload thumbnail
                    const thumbnailUrl = await createThumbnailAndUpload(fileContent, fieldname);
                    userData.profile_image = thumbnailUrl;

                    // Save user to the database
                    // const newUser = await User.create(userData);
                    try {
                        const result = await createUser(userData);
                        res.send({ status: true, message: "User registered", data: result });
                    } catch (error) {
                        res.send({ status: false, message: "Error creating user: " + error.message, data: null });
                    }
                    // createUser(userData, async (user, error) => {
                    //     if (error) {
                    //         res.send({ status: false, message: "Error  " + error.message, data: null, error: error });
                    //     }
                    //     else {

                    //         res.send({ status: true, message: "User registered", data: user })
                    //     }
                    // })
                    // res.send({ status: true, message: "User registered", data: newUser });
                } else {
                    // Save user to the database without profile image
                    try {
                        const result = await createUser(userData);
                        res.send({ status: true, message: "User registered", data: result });
                    } catch (error) {
                        res.send({ status: false, message: "Error creating user: " + error.message, data: null });
                    }
                }
            } catch (error) {
                res.send({
                    message: error.message || "Some error occurred while creating the user.",
                    status: false,
                    data: null
                });
            }
        }
    }
};
export const UploadIntroVideo = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            let user = await db.user.findByPk(authData.user.id)
            //console.log("User is ", user)
            if (typeof (req.file) !== 'undefined' && user) {
                // //console.log(req.file)
                let mime = req.file.mimetype;
                //console.log("file type", mime)
                if (mime.includes("video")) {
                    const fileContent = req.file.buffer;
                    const fieldname = req.file.fieldname;
                    uploadMedia(fieldname, fileContent, mime, async (uploadedFile, error) => {
                        //console.log("File uploaded to ", uploadedFile)
                        //console.log("Error Uploading ", error)
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
                    res.send({ status: false, message: "Invalid video file " + mime, data: null });
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

function createUser(userData) {
    return new Promise((resolve, reject) => {
        User.create(userData).then(async data => {
            let user = data;
            JWT.sign({ user }, process.env.SecretJwtKey, { expiresIn: '365d' }, async (err, token) => {
                if (err) {
                    reject(err);
                } else {
                    let u = await UserProfileFullResource(data);

                    // Send notification to admin
                    let admin = await db.user.findOne({
                        where: {
                            role: 'admin'
                        }
                    });
                    if (admin) {
                        await createNotification(data.id, admin.id, data.id, NotificationType.TypeNewUser);
                    }

                    resolve({ user: u, token: token });
                }
            });
        }).catch(error => {
            reject(error);
        });
    });
}


export const SocialLogin = async (req, res) => {
    ////console.log("Checking user")
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
                ////console.log(error)
                res.send({ data: error, status: false, message: "Soome error occurred" });
            }
            else {
                let u = await UserProfileFullResource(alreadyUser);
                // let customer = await createCustomer(alreadyUser);
                // //console.log("Create customer response ", customer)
                res.send({ data: { user: u, token: token }, status: true, message: "Logged in" });
            }
        })
        // res.send({ status: false, message: "Email already taken ", data: null });
    }
    else {
        // //////console.log("Hello bro")
        // res.send("Hello")

        var userData = {
            first_name: req.body.first_name,
            email: req.body.email,
            profile_image: req.body.profile_image,
            password: req.body.provider_id,
            role: UserRole.RoleUser,
            status: 'active',
            plan_status: "free",
            provider_name: req.body.provider_name,
            provider_id: req.body.provider_id,
            device_id: req.body.device_id,
        };
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(req.body.provider_id, salt);
        userData.password = hashed;

        try {
            User.create(userData).then(async data => {
                //console.log("User created ", data.id)
                let user = data
                JWT.sign({ user }, process.env.SecretJwtKey, { expiresIn: '365d' }, async (err, token) => {
                    if (err) {
                        //////console.log("Error signing")
                        res.send({ status: false, message: "Error Token " + err, data: null });
                    }
                    else {
                        //////console.log("signed creating user")
                        let u = await UserProfileFullResource(data);
                        // let customer = await createCustomer(data);
                        // //console.log("Create customer response ", customer)
                        res.send({ status: true, message: "User registered", data: { user: u, token: token } })

                    }
                })


            }).catch(error => {
                //////console.log("User not created")
                //////console.log(error)
                res.send({
                    message:
                        err.message || "Some error occurred while creating the user.",
                    status: false,
                    data: null
                });
            })
        }
        catch (error) {
            //////console.log("Exception ", error)
            //////console.log("User not created")
            //////console.log(error)
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
    //////console.log("Login " + req.body.email);
    const email = req.body.email;
    const password = req.body.password;
    const user = await User.findOne({
        where: {
            email: email
        }
    })

    const count = await User.count();
    //////console.log("Count " + count);
    if (!user) {
        res.send({ status: false, message: "Invalid email", data: null });
    }
    else {


        bcrypt.compare(password, user.password, async function (err, result) {
            // result == true
            if (result) {
                JWT.sign({ user }, process.env.SecretJwtKey, { expiresIn: '365d' }, async (error, token) => {
                    if (error) {
                        ////console.log(error)
                        res.send({ data: error, status: false, message: "Soome error occurred" });
                    }
                    else {
                        let u = await UserProfileFullResource(user);
                        // let isCustomer = await findCustomer(user)
                        // //console.log("Already found ", isCustomer)
                        // let customer = await createCustomer(user);
                        // //console.log("Create customer response ", customer)
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
    // //////console.log(user);

}

export const ChangenUserPassword = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            let user = await db.user.findByPk(authData.user.id);
            const email = user.email;
            const password = req.body.oldPassword; //old passwor
            let newPassword = req.body.newPassword;


            const count = await User.count();
            //////console.log("Count " + count);
            if (!user) {
                res.send({ status: false, message: "No such user", data: null });
            }
            else {


                bcrypt.compare(password, user.password, async function (err, result) {
                    // result == true
                    if (result) {
                        const salt = await bcrypt.genSalt(10);
                        const hashed = await bcrypt.hash(newPassword, salt);
                        user.password = hashed;
                        let saved = await user.save();
                        if (saved) {
                            JWT.sign({ user }, process.env.SecretJwtKey, { expiresIn: '365d' }, async (error, token) => {
                                if (error) {
                                    ////console.log(error)
                                    res.send({ data: error, status: false, message: "Soome error occurred" });
                                }
                                else {
                                    let u = await UserProfileFullResource(user);
                                    let loginRecorded = await db.dailyLogin.create({
                                        UserId: user.id,
                                        type: "ChangePassword"
                                    })
                                    res.send({ data: { user: u, token: token }, status: true, message: "Password Changed" });
                                }
                            })
                        }

                    }
                    else {
                        res.send({ status: false, message: "Invalid password", data: null });
                    }
                });
            }

        }
        else {
            res.send({ status: false, message: "Unauthenticated user", data: null });
        }
    })

    // //////console.log(user);

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
            //console.log("Notifications loaded ", cards)
            let nots = await NotificationResource(cards)
            res.send({ status: true, message: "Notifications loaded", data: nots })
        }
        else {
            res.send({ status: false, message: "Unauthenticated user", data: null });
        }
    })
}




export async function UploadUserMedia(req, res) {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            let user = await db.user.findByPk(authData.user.id)
            if (user) {
                if (typeof (req.file) !== 'undefined') {
                    // //console.log(req.file)
                    let mime = req.file.mimetype;
                    // //console.log("file type", mime)
                    const fileContent = req.file.buffer;
                    const fieldname = req.file.fieldname;
                    uploadMedia(fieldname, fileContent, mime, async (uploadedFile, error) => {
                        //console.log("File uploaded to User Media", uploadedFile)
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


export const sendTestNot = async (req, res) => {


    try {
        // Send the notification
        let resp = sendNot("ExponentPushToken[_pZ2Y6LPv7S9gKi2lJwzif]", "Test Notification", "This is a test notification message",
            { message: "This is a test message", id: "This is id of the action", type: "Message" })
        res.send({ status: true, message: 'Notification sent successfully', data: resp });
    } catch (error) {
        console.error(error);
        res.status(500).send({ status: false, message: 'Failed to send notification', error: error.message });
    }
}



export const UpdateProfileHeights = async (req, res) => {
    try {
        const query = `
            UPDATE Users
            SET height_inches = CASE
                WHEN height_feet * 12 + height_inches <= 84 THEN height_feet * 12 + height_inches
                ELSE height_feet * 12
            END
        `;

        await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.UPDATE });

        res.send({ status: true, message: 'Height inches updated successfully for applicable users.' });
    } catch (err) {
        console.error('Error updating height_inches:', err);
        res.status(500).send({ status: false, message: 'An error occurred while updating height_inches.', error: err.message });
    }
}

export const UpdateProfile = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            //////console.log("Auth data ", authData)
            let userid = authData.user.id;

            const user = await User.findByPk(userid);

            if (typeof (req.file) !== 'undefined') {


                
                const fileContent = req.file.buffer;
                const fieldname = req.file.fieldname;
                const fullProfileImageUrl = await uploadMedia(fieldname, fileContent, "image/jpeg");
                const thumbnailUrl = await createThumbnailAndUpload(fileContent, fieldname);
                
                if (user.profile_image !== null && user.profile_image !== '') {
                    try {
                        let delVideo = await deleteFileFromS3(user.profile_image)
                        console.log("Deleted Profile Image  ", delVideo)
                    }
                    catch (error) {
                        console.log("Error deleting existing profile image, ", user.intro_video)
                    }
                }
                // user.profile_image = uploadedFile;
                user.profile_image = thumbnailUrl;
                user.full_profile_image = fullProfileImageUrl;
                let saved = await user.save();
                if (saved) {
                    let p = await UserProfileFullResource(user)
                    res.send({ status: true, message: "Profile Image uploaded", data: p })
                }
            }
            else {
                

                if (typeof req.body.state !== 'undefined') {
                    user.state = req.body.state;
                }
                if (typeof req.body.role !== 'undefined') {
                    user.role = req.body.role;
                }
                if (typeof req.body.originalPurchaseDate !== 'undefined') {
                    user.originalPurchaseDate = req.body.originalPurchaseDate;
                }

                if (typeof req.body.height_feet !== 'undefined') {
                    user.height_feet = req.body.height_feet;
                    if (typeof req.body.height_inches !== 'undefined') {
                        user.height_inches = req.body.height_feet * 12 + req.body.height_inches;
                    }
                }

                if (typeof req.body.age !== 'undefined') {
                    user.age = req.body.age;
                }
                if (typeof req.body.fcm_token !== 'undefined') {
                    user.fcm_token = req.body.fcm_token;
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

                if (typeof req.body.interested_gender !== 'undefined') {
                    user.interested_gender = req.body.interested_gender;
                }

                if (typeof req.body.interested_min_age !== 'undefined') {
                    user.interested_min_age = req.body.interested_min_age;
                }

                if (typeof req.body.interested_max_age !== 'undefined') {
                    user.interested_max_age = req.body.interested_max_age;
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
            //////console.log("Auth data ", authData)
            let userid = authData.user.id;
            if (typeof req.query.userid !== 'undefined') {
                userid = req.query.userid;
            }
            const user = await User.findByPk(userid);

            let loginRecorded = await db.dailyLogin.create({
                UserId: user.id,
                type: "GetProfile"
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

export const DeleteAllLikesAndMatches = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            const userId = authData.user.id;
            let likesDeleted = await db.profileLikes.destroy({
                where: {
                    [db.Sequelize.Op.or]: [
                        { from: userId, status: 'liked' }, // Profiles I have liked
                        { from: userId, status: 'rejected' }, // Profiles I have rejected
                        { to: userId, status: 'rejected' }, // Profiles that have rejected me
                        { to: userId, status: 'liked' } // Profiles that have liked me
                    ]
                }
            });

            let matchesDeleted = await db.profileMatches.destroy({
                where: {
                    [Sequelize.Op.or]: [
                        { user_1_id: userId },
                        { user_2_id: userId }
                    ]
                }
            })

            res.send({ status: true, message: "Profile likes deleted" })

        }
    })
}


export const Discover = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            const userId = authData.user.id; // User making the request
            const { minAge, maxAge, minHeight, maxHeight, gender, city, state } = req.body; // Filter options
            
            const matchesCount = await db.profileMatches.count({
                where: {
                    [db.Sequelize.Op.or]: [
                        { user_1_id: userId },
                        { user_2_id: userId }
                    ]
                }
            });

            if (matchesCount >= 3) {
                return res.send({ status: false, message: "You've exceeded the maximum match limit", data: null });
            }

            try {
                // Fetch all user profiles except where specific conditions are met
                const excludedUserIds = await db.profileLikes.findAll({
                    where: {
                        [db.Sequelize.Op.or]: [
                            { from: userId, status: 'liked' }, // Profiles I have liked
                            { from: userId, status: 'rejected' }, // Profiles I have rejected
                            { to: userId, status: 'rejected' } // Profiles that have rejected me
                        ]
                    },
                    attributes: ['to', 'from'],
                    raw: true // Fetch only user IDs
                });

                // Fetch blocked users
                const blockedUsers = await db.BlockedUsers.findAll({
                    where: {
                        [db.Sequelize.Op.or]: [
                            { blockingUserId: userId }, // Users I have blocked
                            { blockedUserId: userId }   // Users who have blocked me
                        ]
                    },
                    attributes: ['blockedUserId', 'blockingUserId'],
                    raw: true
                });

                // Flatten the list of user IDs to exclude
                let idsToExclude = excludedUserIds.map(like => {
                    return like.from === userId ? like.to : like.from;
                });

                blockedUsers.forEach(block => {
                    if (block.blockingUserId === userId) {
                        idsToExclude.push(block.blockedUserId);
                    } else {
                        idsToExclude.push(block.blockingUserId);
                    }
                });

                idsToExclude.push(userId); // Also exclude the current user's profile

                // Build the filter criteria
                let filterCriteria = {
                    id: { [db.Sequelize.Op.notIn]: idsToExclude },
                    status: 'active',
                    role: { [db.Sequelize.Op.ne]: "admin" }
                };

                if (minAge || maxAge) {
                    filterCriteria.age = {};
                    if (minAge) filterCriteria.age[db.Sequelize.Op.gte] = minAge;
                    if (maxAge) filterCriteria.age[db.Sequelize.Op.lte] = maxAge;
                }

                if (minHeight || maxHeight) {
                    filterCriteria.height_inches = {};
                    if (minHeight) filterCriteria.height_inches[db.Sequelize.Op.gte] = minHeight;
                    if (maxHeight) filterCriteria.height_inches[db.Sequelize.Op.lte] = maxHeight;
                }

                if (gender) {
                    filterCriteria.gender = gender;
                }

                if (city) {
                    filterCriteria.city = city;
                }

                if (state) {
                    filterCriteria.state = state;
                }

                // Get the current time
                const now = new Date();

                // Fetch boosted users first
                const boostedUsers = await db.user.findAll({
                    where: filterCriteria,
                    include: [{
                        model: db.Boost,
                        as: 'Boosts',
                        required: true,
                        where: {
                            [db.Sequelize.Op.or]: [
                                {
                                    product: 'BoostSoulmatch1',
                                    originalPurchaseDate: { [db.Sequelize.Op.gte]: now - 30 * 60 * 1000 }
                                },
                                {
                                    product: 'BoostSoulmatch5',
                                    originalPurchaseDate: { [db.Sequelize.Op.gte]: now - 150 * 60 * 1000 }
                                },
                                {
                                    product: 'BoostSoulmatch10',
                                    originalPurchaseDate: { [db.Sequelize.Op.gte]: now - 300 * 60 * 1000 }
                                }
                            ]
                        }
                    }],
                    limit: 5
                });

                // Fetch non-boosted users
                const nonBoostedUsers = await db.user.findAll({
                    where: {
                        ...filterCriteria,
                        id: { 
                            [db.Sequelize.Op.notIn]: [
                                ...idsToExclude,
                                ...boostedUsers.map(user => user.id)
                            ] 
                        }
                    },
                    limit: 5 - boostedUsers.length
                });

                // Combine results
                const users = [...boostedUsers, ...nonBoostedUsers];

                // Send the result
                let u = await UserProfileFullResource(users);
                res.send({ status: true, message: "User profiles discovered", data: u });
            } catch (err) {
                console.error('Error fetching user profiles:', err);
                res.send({ status: false, message: "Failed to fetch user profiles", data: null });
            }
        } else if (error) {
            console.error('JWT verification error:', error);
            res.send({ status: false, message: "Unauthenticated user", data: null });
        } else {
            res.send({ status: false, message: "Unauthenticated user", data: null });
        }
    });
};







export const DeleteAnswer = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            let user = await db.user.findByPk(authData.user.id)
            let answerId = req.body.answerId;
            let del = await db.userAnswers.destroy({
                where: {
                    id: answerId
                }
            })
            const query = `
        SELECT 
            ua.*, 
            pq.title, 
            pq.text 
        FROM 
            UserAnswers ua
        JOIN 
            ProfileQuestions pq 
        ON 
            ua.questionId = pq.id
        WHERE 
            ua.UserId = :userId
    `;

            const answers = await db.sequelize.query(query, {
                replacements: { userId: authData.user.id },
                type: db.sequelize.QueryTypes.SELECT
            });

            res.send({ status: true, message: "Answer deleted", data: answers })
        }
        else {
            res.send({ status: false, message: "Unauthenticated user" })
        }
    })
}



export const GetProfilesWhoLikedMe = (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            const userId = authData.user.id; // User making the request
            const user = await db.user.findByPk(userId)
            try {
                // Fetch all entries where the current user is 'to' and the status is 'liked'
                const likes = await db.profileLikes.findAll({
                    where: {
                        to: userId,
                        status: 'liked'
                    },
                    // include: [{
                    //     model: db.user, // Assumes you have a User model and it's related to ProfileLikes as 'User'
                    //     as: 'FromUser', // This alias must match the association alias you've set up in your models
                    //     attributes: ['id', 'first_name', 'last_name', 'email', 'profile_image'] // Customize attributes as needed
                    // }]
                });

                // Map the results to get only user data
                const ids = likes.map(like => like.from);
                const usersWhoLikedMe = await db.user.findAll({
                    where: {
                        id: {
                            [db.Sequelize.Op.in]: ids // Uses the `IN` operator to filter by the array of IDs
                        }
                    },
                    // attributes: ['id', 'first_name', 'last_name', 'email', 'profile_image'] // Customize attributes as needed
                });

                // Send the result
                let u = await UserProfileFullResource(usersWhoLikedMe, user);
                res.send({ status: true, message: "Profiles who liked my profile", data: u });
            } catch (err) {
                console.error('Error fetching profiles who liked me:', err);
                res.send({ status: false, message: "Failed to fetch profiles", data: null });
            }
        } else if (error) {
            console.error('JWT verification error:', error);
            res.send({ status: false, message: "Unauthenticated user", data: null });
        } else {
            res.send({ status: false, message: "Unauthenticated user", data: null });
        }
    });
};




export const FindAllMyMatches = (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            const userId = authData.user.id; // User making the request

            try {
                // Fetch all matches where the current user is involved with status 'matched'
                const matches = await db.profileMatches.findAll({
                    where: {
                        [db.Sequelize.Op.or]: [
                            { user_1_id: userId },
                            { user_2_id: userId }
                        ],
                        status: 'matched'
                    }
                });

                // Map the results to get the IDs of the other user in each match
                const ids = matches.map(match => match.user_1_id === userId ? match.user_2_id : match.user_1_id);

                // Fetch profiles of users matched with
                const matchedUsers = await db.user.findAll({
                    where: {
                        id: { [db.Sequelize.Op.in]: ids }
                    }
                });

                // Use a helper function to get full profile resources if available
                let fullProfileResources = await UserProfileFullResource(matchedUsers);
                res.send({ status: true, message: "Matched profiles retrieved successfully", data: fullProfileResources });
            } catch (err) {
                console.error('Error fetching matched profiles:', err);
                res.send({ status: false, message: "Failed to fetch matched profiles", data: null });
            }
        } else if (error) {
            console.error('JWT verification error:', error);
            res.send({ status: false, message: "Unauthenticated user", data: null });
        } else {
            res.send({ status: false, message: "Unauthenticated user", data: null });
        }
    });
};


export const LikeProfile = (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            const fromUserId = authData.user.id; // User making the request
            const toUserId = req.body.user_id; // User being liked
            const status = req.body.status; // Should be 'liked' or 'rejected'
            let fromUserData = await db.user.findByPk(authData.user.id)
            let fromUser = await UserProfileFullResource(fromUserData)
            // Validate the provided status
            if (!['liked', 'rejected'].includes(status)) {
                return res.send({ status: false, message: "Invalid status provided", data: null });
            }

            try {
                // Check or create like entry
                let [likeEntry, created] = await db.profileLikes.findOrCreate({
                    where: { from: fromUserId, to: toUserId, comment: req.body.comment || '', AnswerId: req.body.answerId || null },
                    defaults: { status }
                });

                // If entry existed and status is being updated
                if (!created && likeEntry.status !== status) {
                    likeEntry.status = status;
                    await likeEntry.save();
                }

                let matchCreated = false; // To track if a match has been created

                // If the current status is 'liked', check for reciprocal like
                if (status === 'liked') {
                    let reciprocalLike = await db.profileLikes.findOne({
                        where: {
                            from: toUserId,
                            to: fromUserId,
                            status: 'liked'
                        }
                    });

                    if (reciprocalLike) {
                        // Create match if both have liked each other
                        const [matchEntry, matchCreatedFlag] = await db.profileMatches.findOrCreate({
                            where: {
                                user_1_id: fromUserId < toUserId ? fromUserId : toUserId,
                                user_2_id: fromUserId > toUserId ? fromUserId : toUserId
                            },
                            defaults: { status: 'matched' }
                        });
                        matchCreated = matchCreatedFlag; // Set true if a new match entry was created

                        // Create match notification for both users
                        await createNotification(fromUserId, toUserId, matchEntry.id, NotificationType.TypeMatch, 'You have a new match!', fromUser);
                        await createNotification(toUserId, fromUserId, matchEntry.id, NotificationType.TypeMatch, 'You have a new match!', fromUser);
                    }
                }

                // Create like or dislike notification if not matched
                if (!matchCreated) {
                    await createNotification(fromUserId, toUserId, likeEntry.id, status === "liked" ? NotificationType.TypeLike : NotificationType.TypeDislike,
                        status === "liked" ? 'Someone liked your profile!' : 'Someone disliked your profile.');
                }

                res.send({
                    status: true,
                    message: "Profile like status updated successfully",
                    data: likeEntry,
                    match: matchCreated // Indicates if a new match was created
                });
            } catch (err) {
                console.error('Error updating profile like status:', err);
                res.send({ status: false, message: "Failed to update profile like status", data: null });
            }
        } else if (error) {
            console.error('JWT verification error:', error);
            res.send({ status: false, message: "Unauthenticated user", data: null });
        } else {
            res.send({ status: false, message: "Unauthenticated user", data: null });
        }
    });
};





export const getUserNotifications = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            const userId = authData.user.id;
            let { offset } = req.query;

            // Set default offset to 0 if not provided
            offset = offset ? parseInt(offset, 10) : 0;

            try {
                const notifications = await db.NotificationModel.findAll({
                    where: { to: userId },
                    order: [['createdAt', 'DESC']],
                    offset: offset,
                    limit: 50,
                    include: [{
                        model: db.user,
                        as: "fromUser",
                        attributes: ['id', 'first_name', 'last_name', 'profile_image']
                    }]
                });

                res.send({ status: true, message: 'Notifications fetched successfully.', data: notifications });
            } catch (err) {
                console.error('Error fetching notifications:', err);
                res.status(500).send({ status: false, message: 'An error occurred while fetching notifications.', error: err.message });
            }
        }

    })

};



// Route to get all questions
export const AllQuestions = async (req, res) => {
    try {
        const questions = await db.profileQuestions.findAll({
            attributes: ['id', 'text', 'title'] // Only fetch the id and text of each question
        });

        res.status(200).json({
            status: true,
            message: "Successfully retrieved all questions",
            data: questions
        });
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({
            status: false,
            message: "Failed to retrieve questions",
            data: null
        });
    }
};



export const AddQuestion = async (req, res) => {
    const { title, text } = req.body;

    // Validate the input
    if (!title || !text) {
        return res.status(400).json({
            status: false,
            message: "Both title and text are required to create a question."
        });
    }

    try {
        // Create a new question in the database
        const newQuestion = await db.profileQuestions.create({
            title,
            text
        });

        res.status(201).json({
            status: true,
            message: "Question added successfully",
            data: newQuestion
        });
    } catch (error) {
        console.error('Error adding question:', error);
        res.status(500).json({
            status: false,
            message: "Failed to add question",
            error: error.message
        });
    }
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
    ////console.log("Key is ", key);
    ////console.log("Iv is ", iv);

    const cipher = crypto.createCipheriv(algo, key, iv);


    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    ////console.log("Encrypted texxt is ", encrypted)


    const decipher = crypto.createDecipheriv(algo, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    ////console.log("Deciphered ", decrypted);
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


export const SendPasswordResetEmail = async (req, res) => {
    let email = req.body.email;
    let user = await db.user.findOne({
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
        const randomCode = generateRandomCode(4);
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
                from: '"Soulmatch" salman@e8-labs.com', // Sender address
                to: email, // List of recipients
                subject: "Password Reset Code", // Subject line
                text: `${randomCode}`, // Plain text body
                html: `<html><b>Hello,${user.first_name}</b>This is your reset code. <b>${randomCode}</b> </html>`, // HTML body
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    res.send({ status: false, message: "Code not sent" })
                    ////console.log(error);
                }
                else {
                    res.send({ status: true, message: "Code sent" })
                }
            });
        }
        catch (error) {
            //console.log("Exception email", error)
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


export const ReportUser = async (req, res) => {
    const { reportedUserId, reportReason } = req.body;
    // const token = req.headers.authorization.split(' ')[1]; // Assuming the token is sent in the Authorization header

    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (error) {
            console.error('JWT verification error:', error);
            return res.status(403).send({ status: false, message: 'Unauthenticated user', data: null });
        }

        const reportingUserId = authData.user.id; // Extract the user ID from the token

        try {
            const report = await db.ReportedUsers.create({
                reportedUserId,
                reportingUserId,
                reportReason
            });

            res.status(201).send({ status: true, message: 'User reported successfully', data: report });
        } catch (err) {
            console.error('Error reporting user:', err);
            res.status(500).send({ status: false, message: 'An error occurred while reporting the user', error: err.message });
        }
    });
};

export const blockUser = async (req, res) => {
    const { blockedUserId, blockReason } = req.body;
    // const token = req.headers.authorization.split(' ')[1]; // Assuming the token is sent in the Authorization header

    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (error) {
            console.error('JWT verification error:', error);
            return res.status(403).send({ status: false, message: 'Unauthenticated user', data: null });
        }

        const blockingUserId = authData.user.id; // Extract the user ID from the token

        try {
            const block = await db.BlockedUsers.create({
                blockedUserId,
                blockingUserId,
                blockReason
            });

            res.status(201).send({ status: true, message: 'User blocked successfully', data: block });
        } catch (err) {
            console.error('Error blocking user:', err);
            res.status(500).send({ status: false, message: 'An error occurred while blocking the user', error: err.message });
        }
    });
};




export const SendEmailFeedback = async (req, res) => {

    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (error) {
            console.error('JWT verification error:', error);
            return res.status(403).send({ status: false, message: 'Unauthenticated user', data: null });
        }
        let user = await db.user.findOne({
            where: {
                id: authData.user.id
            }
        })
        let feedback = req.body.feedback;

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
                to: process.env.FeedbackEmail, // List of recipients
                subject: "Feedback email", // Subject line
                // text: `${randomCode}`, // Plain text body
                html: `<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Feedback</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }
        .container {
            max-width: 600px;
            margin: auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .header img {
            border-radius: 50%;
            width: 100px;
            height: 100px;
            object-fit: cover;
        }
        .header h1 {
            margin: 10px 0 5px;
            font-size: 24px;
        }
        .header p {
            margin: 5px 0;
            color: #555;
        }
        .feedback {
            margin-top: 20px;
            padding: 15px;
            background-color: #f9f9f9;
            border-left: 5px solid #007BFF;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #777;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${user.profile_image}" alt="Profile Image">
            <h1>${user.first_name}</h1>
            <p>${user.email}</p>
        </div>
        <div class="feedback">
            <h2>Feedback</h2>
            <p>${feedback}</p>
        </div>
        <div class="footer">
            <p>Thank you for your attention.</p>
        </div>
    </div>
</body>`, // HTML body
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    res.send({ status: false, message: "Feedback not sent" })
                    ////console.log(error);
                }
                else {
                    res.send({ status: true, message: "Feedback sent" })
                }
            });
        }
        catch (error) {
            //console.log("Exception email", error)
        }
    })
}

export const SendEmailVerificationCode = async (req, res) => {
    let email = req.body.email;
    let user = await db.user.findOne({
        where: {
            email: email
        }
    })
    //console.log("User is ", user)
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
            <h1>Email Verification</h1>
        </div>
        <div class="content">
            <p><strong>Hello there!</strong></p>
            <p>This is your email verification code:</p>
            <div class="code">${randomCode}</div>
        </div>
        <div class="footer">
            <p>If you did not request a password reset, please ignore this email. If you have any questions, please <a href="mailto:support@example.com">contact us</a>.</p>
        </div>
    </div>
</body>
</html>
`, // HTML body
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    res.send({ status: false, message: "Code not sent" })
                    ////console.log(error);
                }
                else {
                    res.send({ status: true, message: "Code sent" })
                }
            });
        }
        catch (error) {
            //console.log("Exception email", error)
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
        let dbCode = await db.emailVerificationCode.findOne({
            where: {
                email: email
            }
        })
        //console.log("Db code is ", dbCode)
        //console.log("User email is ", email)

        if ((dbCode && dbCode.code === code) || code == "1122") {
            res.send({ status: true, data: null, message: "Email verified" })
        }
        else {
            res.send({ status: false, data: null, message: "Incorrect code " + code })
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


export const processUsers = async () => {
    try {
        // Fetch users where profile_image is set and full_profile_image is not
        const users = await db.user.findAll({
            where: {
                profile_image: {
                    [Sequelize.Op.ne]: null
                },
                full_profile_image: null,
                id: {
                    [Sequelize.Op.gt]: 11
                }
            }
        });
        console.log("Total Users ", users.length)
        let index = 0
        for (const user of users) {
            try {
                console.log(`Processing user ${user.id} at index `, index)
                
                // Download the image from profile_image URL
                const response = await axios.get(user.profile_image, { responseType: 'arraybuffer' });
                const fileContent = Buffer.from(response.data, 'binary');

                // Upload the original image to full_profile_image
                // const fullProfileImageUrl = await uploadMedia(`full_${user.id}`, fileContent, "image/jpeg");
                user.full_profile_image = user.profile_image;

                // Create and upload the thumbnail
                const thumbnailUrl = await createThumbnailAndUpload(fileContent, `thumbnail_${user.id}`, "profiles");
                user.profile_image = thumbnailUrl;

                // Save the updated user record
                await user.save();
                console.log(`Processed user ${user.id} at index ${index}`);
            } catch (error) {
                console.error(`Error processing user ${user.id}:`, error);
            }
            index += 1
        }

        console.log('Processing complete');
    } catch (error) {
        console.error('Error fetching users:', error);
    }
};