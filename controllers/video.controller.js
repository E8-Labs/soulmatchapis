import ffmpeg from 'fluent-ffmpeg';
import db from "../models/index.js";
// import S3 from "aws-sdk/clients/s3.js";
import JWT from "jsonwebtoken";
import bcrypt from 'bcryptjs';
import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import { uploadMedia, deleteFileFromS3, createThumbnailAndUpload } from '../utilities/storage.js';


import UserRole from "../models/userrole.js";

import UserProfileFullResource from "../resources/userprofilefullresource.js";
import NotificationResource from "../resources/notification.resource.js";


// Promisify fs functions for easier async/await usage
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

// Configure AWS SDK if not already done
if (!AWS.config.credentials) {
    AWS.config.update({
        accessKeyId: process.env.AccessKeyId,
        secretAccessKey: process.env.SecretAccessKey,
        region: process.env.Region,
    });
}

const s3 = new AWS.S3();

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


const ensureDirExists = async (dir) => {
    if (!fs.existsSync(dir)) {
        await mkdir(dir, { recursive: true });
    }
};

export const UploadIntroVideoInVideoController = async (req, res) => {
    console.log("Thumbnail testing")
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            let user = await db.user.findByPk(authData.user.id);
            //console.log("User is ", user)
            if (req.files && req.files.media && req.files.media.length > 0 && user) {
                let file = req.files.media[0]
                let mime = file.mimetype;
                if (mime.includes("video")) {
                    const fileContent = file.buffer;
                    const fieldname = file.fieldname;

                    //   uploadMedia(fieldname, fileContent, mime, async (uploadedFile, error) => {
                    //     if (error) {
                    //       return res.send({ status: false, message: "Error uploading video", error });
                    //     }

                    //     user.intro_video = uploadedFile;
                    //     let saved = await user.save();

                    // if (saved) {
                    // Save the uploaded video to a temporary file
                    const tempDir = './temp';
                    const thumbnailsDir = './thumbnails';
                    await ensureDirExists(tempDir);
                    await ensureDirExists(thumbnailsDir);
                    const tempVideoPath = `./temp/${file.originalname}`;
                    await writeFile(tempVideoPath, fileContent);

                    // Generate the thumbnail
                    const thumbnailPath = `./temp/thumbnail-${path.basename(file.originalname, path.extname(file.originalname))}.png`;
                    try {
                        await generateThumbnail(tempVideoPath, thumbnailPath);

                        // Upload the thumbnail to S3
                        const thumbnailKey = `thumbnails/${path.basename(thumbnailPath)}`;
                        // const uploadResult = await uploadToS3(thumbnailPath, process.env.S3_BUCKET_NAME, thumbnailKey);

                        // Clean up temporary files
                        await unlink(tempVideoPath);
                        await unlink(thumbnailPath);

                        // Save the thumbnail URL to the user profile if needed
                        user.intro_thumbnail_url = thumbnailPath;// uploadResult.Location;
                        saved = await user.save();

                        if (saved) {
                            let u = await UserProfileFullResource(user);
                            res.send({ status: true, message: "Intro video and thumbnail saved", data: u });
                        } else {
                            res.send({ status: false, message: "Error saving intro video and thumbnail", data: null });
                        }
                    } catch (err) {
                        console.error('Error generating or uploading thumbnail:', err);
                        res.send({ status: false, message: "Error generating or uploading thumbnail", error: err });
                    }
                    // } else {
                    //   res.send({ status: false, message: "Error saving intro video", data: null });
                    // }
                    //   });
                } else {
                    res.send({ status: false, message: "Invalid video file " + mime, data: null });
                }
            } else {
                res.send({ status: false, message: "Please upload a video" });
            }
        } else {
            res.send({ status: false, message: "Unauthenticated user" });
        }
    });
};

export const DeleteMedia = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            let user = await db.user.findByPk(authData.user.id);
            if (typeof req.body.media_id !== 'undefined') {
                let med = await db.userMedia.findByPk(req.body.media_id)
                if(med){
                    if(med.url !== null && med.url !== ""){
                        try {
                            let delVideo = await deleteFileFromS3(med.url)
                            if(med.thumb_url !== null && med.thumb_url !== ""){
                                let delThumb = await deleteFileFromS3(med.thumb_url)
                                console.log("Deleted thumb", delThumb)
                            }
                            console.log("Deleted Media  ", delVideo)
                            
                        }
                        catch(error){
                            console.log("Error deleting existing intro, ", user.intro_video)
                            // res.send({ status: false, message: "Error deleting existing introe ", data: null });
                            // return
                        }
                    }
                }
                let deleted = await db.userMedia.destroy({
                    where: {
                        id: req.body.media_id
                    }
                })
                if (deleted) {
                    let media = await db.userMedia.findAll({
                        where: {
                            UserId: user.id
                        }
                    })
                    res.send({ status: true, message: "Media deleted", data: media });
                }
            }
            else if (typeof req.body.media_url !== 'undefined') {

                let deleted = await db.userMedia.destroy({
                    where: {
                        url: req.body.media_url
                    }
                })
                //console.log("Media url is not undefined ", deleted)
                if (deleted) {
                    let media = await db.userMedia.findAll({
                        where: {
                            UserId: user.id
                        }
                    })
                    res.send({ status: true, message: "Media deleted", data: media });
                }
            }
        }
        else {
            res.send({ status: false, message: "Unauthenticated user" });
        }
    })
}


export const DeleteIntroVideo = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            let user = await db.user.findByPk(authData.user.id);
            //delete video from aws
            user.intro_thumbnail_url = null;//thumbUrl;
            user.intro_video = null;//uploadedFileUrl;
            let saved = user.save();
            if (saved) {
                let p = await UserProfileFullResource(user);
                res.send({ status: true, message: "User intro deleted", data: p });
            }
        }
        else {
            res.send({ status: false, message: "Unauthenticated user" });
        }

    })
}

//THis is the api being used
export const UploadIntroVideos = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            let user = await db.user.findByPk(authData.user.id);
            //console.log("User is ", user);
            if (user.intro_video !== null && user.intro_video !== '') {
                console.log("Exists intro video so deleting")
                //delete existing 
                try {
                    let delVideo = await deleteFileFromS3(user.intro_video)
                    let delThumb = await deleteFileFromS3(user.intro_thumbnail_url)
                    console.log("Deleted intro ", delVideo)
                    console.log("Deleted thumb", delThumb)
                }
                catch(error){
                    console.log("Error deleting existing intro, ", user.intro_video)
                    // res.send({ status: false, message: "Error deleting existing introe ", data: null });
                    // return
                }
            }
            if (req.files && req.files.media && req.files.media.length > 0 && user) {
                let uploadedFileUrl = null;
                let thumbUrl = null;
                let file = req.files.media[0]
                let thumb = null
                if (req.files.thumbnail.length > 0) {
                    thumb = req.files.thumbnail[0]
                }
                //console.log("Media files ", file)
                //console.log("Thumb files ", thumb)
                // return
                // for (const file of req.files) {

                let mime = file.mimetype;
                //console.log("File type", mime);

                if (mime.includes("video")) {
                    const fileContent = file.buffer;
                    const fieldname = file.fieldname;
                    uploadedFileUrl = await uploadMedia(fieldname, fileContent, mime, "intro_videos");
                    

                    let thumbContent = thumb.buffer;
                    let thumbMime = thumb.mimetype;
                    thumbUrl = await uploadMedia("thumb" + fieldname, thumbContent, thumbMime, "intro_videos");
                    


                } else {
                    res.send({ status: false, message: "Invalid video file " + mime, data: null });
                    return;
                }
                // }
                user.intro_thumbnail_url = thumbUrl;
                user.intro_video = uploadedFileUrl;
                // user.intro_videos = uploadedFiles; // Assuming intro_videos is an array field in your user model
                let saved = await user.save();

                if (saved) {
                    let u = await UserProfileFullResource(user);
                    res.send({ status: true, message: "Intro videos saved", data: u });
                } else {
                    res.send({ status: false, message: "Error saving intro videos", data: null });
                }
            } else {
                res.send({ status: false, message: "Please upload videos" });
            }
        } else {
            res.send({ status: false, message: "Unauthenticated user" });
        }
    });
};


//upload user media files
export async function UploadUserMedia(req, res) {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            let user = await db.user.findByPk(authData.user.id)
            if (user) {
                if (req.files && req.files.media && req.files.media.length > 0) {

                    let file = req.files.media[0]
                    let thumb = null
                    if (req.files.thumbnail && req.files.thumbnail.length > 0) {
                        thumb = req.files.thumbnail[0]
                    }
                    //console.log("Media files ", file)
                    //console.log("Thumb files ", thumb)
                    // return
                    // for (const file of req.files) {

                    let mime = file.mimetype;
                    //console.log("File type", mime);

                    if (mime.includes("video")) {
                        let uploadedFileUrl = null;
                        let thumbUrl = null;
                        const fileContent = file.buffer;
                        const fieldname = file.fieldname;

                        
                        uploadedFileUrl = await uploadMedia(fieldname, fileContent, mime, "media");

                        let thumbContent = thumb.buffer;
                        let thumbMime = thumb.mimetype;
                        thumbUrl = await uploadMedia("thumb" + fieldname, thumbContent, thumbMime, "media");
                        
                        let type = mime.includes("video") ? "video" : "image"
                        let created = await db.userMedia.create({
                            UserId: user.id,
                            type: type,
                            url: uploadedFileUrl,
                            caption: req.body.caption,
                            thumb_url: thumbUrl,
                        })
                        if (created) {

                            res.send({ status: true, message: "Media saved", data: created });
                        }
                        else {
                            res.send({ status: false, message: "Error saving media", data: null });
                        }

                    }
                    else {



                        // //console.log("file type", mime)
                        const fileContent = file.buffer;
                        const fieldname = file.fieldname;
                        const uploadedFile = await uploadMedia(fieldname, fileContent, mime, "media");
                        const thumbnailUrl = await createThumbnailAndUpload(fileContent, fieldname, "media");
                        let type = mime.includes("video") ? "video" : "image"
                            let created = await db.userMedia.create({
                                UserId: user.id,
                                type: type,
                                url: uploadedFile,
                                thumb_url: thumbnailUrl,
                                caption: req.body.caption
                            })
                            if (created) {

                                res.send({ status: true, message: "Media saved", data: created });
                            }
                            else {
                                res.send({ status: false, message: "Error saving media", data: null });
                            }
                    }



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




//function to upload to AWS
// function uploadMedia(fieldname, fileContent, mime = "image/jpeg", folder = "media", completion) {
//     const s3 = new S3({
//         accessKeyId: process.env.AccessKeyId,
//         secretAccessKey: process.env.SecretAccessKey,
//         region: process.env.Region
//     })
//     const params = {
//         Bucket: process.env.Bucket,
//         Key: folder + "/" + fieldname + "Profile" + Date.now(),
//         Body: fileContent,
//         ContentDisposition: 'inline',
//         ContentType: mime
//         // ACL: 'public-read',
//     }
//     const result = s3.upload(params, async (err, d) => {
//         if (err) {
//             completion(null, err.message);
//             // return null
//         }
//         else {
//             // user.profile_image = d.Location;
//             completion(d.Location, null);
//         }
//     });
// }

// Route to submit an answer to a question
export const AnswerQuestion = async (req, res) => {
    //console.log("Upload answer");
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (error || !authData) {
            return res.status(401).json({
                status: false,
                message: "Authentication failed"
            });
        }

        const { questionId, answerText } = req.body;
        const answers = await db.userAnswers.findAll({
            where: { UserId: authData.user.id }
        })
        let answer = await db.userAnswers.findOne(
            {
                where: {
                    UserId: authData.user.id,
                    questionId: questionId
                }
            }
        )
        if (answers.length >= 3 && !answer) {
            console.log("Can not add more than 3 questions", answer)
            return res.status(200).json({
                status: false,
                message: "Can not add more than 3 questions"
            });
        }
        else {
            const files = req.files;

            if (!authData.user.id || !questionId) {
                return res.status(400).json({
                    status: false,
                    message: "Missing required user or question identification data"
                });
            }

            try {
                let answerImage = null, answerVideo = null, videoThumbnail = null;

                if (files.media) {
                    const uploadedFile = await uploadMedia(files.media[0].fieldname, files.media[0].buffer, files.media[0].mimetype, "questions");
                    files.media[0].mimetype.includes("video") ? answerVideo = uploadedFile : answerImage = uploadedFile;
                    // await new Promise((resolve, reject) => {
                    //     uploadMedia(files.media[0].fieldname, files.media[0].buffer, files.media[0].mimetype, "questions", (uploadedUrl, error) => {
                    //         if (error) {
                    //             reject(new Error("Failed to upload media"));
                    //         } else {
                    //             files.media[0].mimetype.includes("video") ? answerVideo = uploadedUrl : answerImage = uploadedUrl;
                    //             resolve();
                    //         }
                    //     });
                    // });
                }

                if (files.media && files.media[0].mimetype.includes("video") && files.thumbnail) {
                    const uploadedFile = await uploadMedia(files.thumbnail[0].fieldname, files.thumbnail[0].buffer, files.thumbnail[0].mimetype, "questions");
                    videoThumbnail = uploadedFile;
                    
                }

                //check already added same question

                // create the new question
                if (answer) {
                    answer.answerText = answerText;
                    answer.answerImage = answerImage;
                    answer.answerVideo = answerVideo;
                    answer.videoThumbnail = videoThumbnail;
                    let saved = await answer.save();
                }
                else {
                    const newAnswer = await db.userAnswers.create({
                        UserId: authData.user.id,
                        questionId,
                        answerText,
                        answerImage,
                        answerVideo,
                        videoThumbnail
                    });
                }

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

                res.status(201).json({
                    status: true,
                    message: "Answer submitted successfully",
                    data: answers
                });

            } catch (uploadError) {
                console.error('Error submitting answer:', uploadError);
                res.status(500).json({
                    status: false,
                    message: "Failed to submit answer",
                    error: uploadError.message
                });
            }
        }

    });
};

