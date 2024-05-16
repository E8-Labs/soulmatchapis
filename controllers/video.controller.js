import ffmpeg from 'fluent-ffmpeg';
import db from "../models/index.js";
import S3 from "aws-sdk/clients/s3.js";
import JWT from "jsonwebtoken";
import bcrypt from 'bcrypt';
import AWS  from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';


// Promisify fs functions for easier async/await usage
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

const generateThumbnail = (videoPath, thumbnailPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .on('end', () => {
        console.log('Screenshot taken');
        resolve(thumbnailPath);
      })
      .on('error', (err) => {
        console.log('An error occurred: ' + err.message);
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

const uploadToS3 = async (filePath, bucketName, key) => {
  return readFile(filePath)
    .then(data => {
      const params = {
        Bucket: bucketName,
        Key: key,
        Body: data,
        ContentType: 'image/png'
      };

      return s3.upload(params).promise();
    });
};
const ensureDirExists = async (dir) => {
    if (!fs.existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  };

export const UploadIntroVideoInVideoController = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let user = await db.user.findByPk(authData.user.id);
      console.log("User is ", user)
      if (typeof (req.file) !== 'undefined' && user) {
        let mime = req.file.mimetype;
        if (mime.includes("video")) {
          const fileContent = req.file.buffer;
          const fieldname = req.file.fieldname;

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
              const tempVideoPath = `./temp/${req.file.originalname}`;
              await writeFile(tempVideoPath, fileContent);

              // Generate the thumbnail
              const thumbnailPath = `./temp/thumbnail-${path.basename(req.file.originalname, path.extname(req.file.originalname))}.png`;
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
