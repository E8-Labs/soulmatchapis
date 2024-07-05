import ffmpeg from 'fluent-ffmpeg';
import db from "../models/index.js";
// import S3 from "aws-sdk/clients/s3.js";
import JWT from "jsonwebtoken";
import bcrypt from 'bcryptjs';
import AWS from 'aws-sdk';
import url from 'url';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import sharp from 'sharp';




// Promisify fs functions for easier async/await usage
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

// Configure AWS SDK
if (!AWS.config.credentials) {
    AWS.config.update({
        accessKeyId: process.env.AccessKeyId,
        secretAccessKey: process.env.SecretAccessKey,
        region: process.env.Region,
    });
}
console.log('AWS Credentials:', {
    accessKeyId: process.env.AccessKeyId,
        secretAccessKey: process.env.SecretAccessKey,
        region: process.env.Region,
});

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





// Initialize the S3 client


// Function to delete a file from S3 using its URL
export async function deleteFileFromS3(fileUrl) {
  // Parse the URL to get the bucket name and key
  const parsedUrl = url.parse(fileUrl);
  const bucketName = parsedUrl.host.split('.')[0];
  const key = decodeURIComponent(parsedUrl.pathname.slice(1));

  console.log(`Bucket ${bucketName} Key: ${key}`)
  // Set up parameters for the delete operation
  const params = {
    Bucket: bucketName,
    Key: key,
  };

  try {
    // Delete the object using async/await
    const data = await s3.deleteObject(params).promise();
    console.log(`File '${key}' successfully deleted from bucket '${bucketName}'`);
    return data;
  } catch (err) {
    console.log(err)
    console.error(`Error deleting file: ${err.message}`);
    throw err;
  }
}


//function to upload to AWS
// export  function uploadMedia(fieldname, fileContent, mime = "image/jpeg", folder = "media", completion) {
    
//     const params = {
//         Bucket: process.env.Bucket,
//         Key: folder + "/" + fieldname + Date.now(),
//         Body: fileContent,
//         ContentDisposition: 'inline',
//         ContentType: mime
//         // ACL: 'public-read',
//     }
//     const result = s3.upload(params, async (err, d) => {
//         if (err) {
//             if(completion){
//                 completion(null, err.message);
//             }
//             // return null
//         }
//         else {
//             // user.profile_image = d.Location;
//             if(completion){
//                 completion(d.Location, null);
//             }
            
//         }
//     });
// }
export const uploadMedia = (fieldname, fileContent, mime = "image/jpeg", folder = "media") => {
    return new Promise((resolve, reject) => {
        const params = {
            Bucket: process.env.Bucket,
            Key: `${folder}/${fieldname}${Date.now()}`,
            Body: fileContent,
            ContentDisposition: 'inline',
            ContentType: mime,
        };

        s3.upload(params, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data.Location);
            }
        });
    });
};

export const createThumbnailAndUpload = async (fileContent, fieldname, folder = "media") => {
    const image = sharp(fileContent);
    const metadata = await image.metadata();
    const width = 420;
    const height = Math.round((metadata.height / metadata.width) * width);

    const thumbnailBuffer = await image.resize(width, height).toBuffer();
    const thumbnailUrl = await uploadMedia(`thumbnail_${fieldname}`, thumbnailBuffer, "image/jpeg", folder);
    return thumbnailUrl;
};



// Example usage
const fileUrl = 'https://your-bucket-name.s3.amazonaws.com/path/to/your/file.txt';

// deleteFileFromS3(fileUrl)
//   .then(data => console.log('Delete operation successful:', data))
//   .catch(err => console.error('Delete operation failed:', err));
