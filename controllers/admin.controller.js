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


import UserRole from "../models/userrole.js";

import UserProfileFullResource from "../resources/userprofilefullresource.js";
import UserProfileLiteResource from "../resources/userprofileliteresource.js";


const countUniqueDownloads = async (days) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);
  
      const result = await User.findAndCountAll({
        where: {
          [Op.or]: [
            { createdAt: { [Op.gte]: thirtyDaysAgo } },
            { updatedAt: { [Op.gte]: thirtyDaysAgo } }
          ]
        },
        attributes: [
          [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('device_id'))), 'uniqueDeviceCount']
        ],
        raw: true
      });
  
      return result.count;
    } catch (error) {
      console.error('Error in counting unique users:', error);
      return null;
    }
  };

  const uniqueDownloads = async (days) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);
  
      // First, get the total number of unique users in the last 30 days
      const totalUsersResult = await User.findOne({
        where: {
          [Op.or]: [
            { createdAt: { [Op.gte]: thirtyDaysAgo } },
            // { updatedAt: { [Op.gte]: thirtyDaysAgo } }
          ]
        },
        attributes: [
          [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('device_id'))), 'total']
        ],
        raw: true
      });
  
      // Get the daily counts of unique users
      const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    const dailyUsersResult = await User.findAll({
        where: {
          [Op.or]: [
            { createdAt: { [Op.gte]: startDate } },
            { updatedAt: { [Op.gte]: startDate } }
          ]
        },
        attributes: [
          [db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'date'],
          [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('device_id'))), 'total_users']
        ],
        group: [db.sequelize.fn('DATE', db.sequelize.col('createdAt'))],
        order: [[db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'ASC']],
        raw: true
      });
    //   console.log("DA Users ", dailyUsersResult)
  
      // Create an array of dates from startDate to endDate
      let dateArray = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dateArray.push(new Date(d));
      }
  
      // Map the results to a date-indexed object for quick lookup
      const resultLookup = dailyUsersResult.reduce((acc, cur) => {
        acc[cur.date] = cur.total_users;
        return acc;
      }, {});
  
      // Ensure all dates are represented in the graph data
      const graphData = dateArray.map(date => ({
        date: moment(date).format('YYYY-MM-DD'),
        total_users: resultLookup[moment(date).format('YYYY-MM-DD')] || 0 // Default to 0 if no data exists for this date
      }));
  
      return {
        total: totalUsersResult.total,
        graph_data: graphData
      };
    } catch (error) {
      console.error('Error in fetching unique downloads:', error);
      return { total: 0, graph_data: [] };
    }
  };
  
  const fetchLoginActivity = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
  
      // Get the total number of unique users
      const totalUniqueUsers = await db.dailyLogin.count({
        distinct: true,
        col: 'userId',
        where: {
          createdAt: { [Op.gte]: startDate }
        }
      });
  
      // Get the total number of logins
      const totalLogins = await db.dailyLogin.count({
        where: {
          createdAt: { [Op.gte]: startDate }
        }
      });
  
      // Get the daily counts of unique users
      const dailyLoginData = await db.dailyLogin.findAll({
        where: {
          createdAt: { [Op.gte]: startDate }
        },
        attributes: [
          [db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'date'],
          [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('userId'))), 'total_users']
        ],
        group: [db.sequelize.fn('DATE', db.sequelize.col('createdAt'))],
        order: [[db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'ASC']],
        raw: true
      });
      console.log("DA Users ", dailyLoginData)
  
      // Create an array of all dates from startDate to endDate
      let dateArray = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dateArray.push(new Date(d));
      }
      console.log("Date array ", dateArray)
      // Map results to a date-indexed object
      const loginDataByDate = dailyLoginData.reduce((acc, cur) => {
        acc[cur.date] = cur.total_users;
        return acc;
      }, {});
  
      // Combine all dates with the login data, defaulting to zero where no data exists
      const graphData = dateArray.map(date => ({
        date: moment(date).format('YYYY-MM-DD'),
        total_users: loginDataByDate[moment(date).format('YYYY-MM-DD')] || 0  // Default to 0 if no data exists for a date
      }));
  
      return {
        totalUniqueUsers,
        totalLogins,
        graphData
      };
    } catch (error) {
      console.error('Error in fetching login activity:', error);
      return {
        totalUniqueUsers: 0,
        totalLogins: 0,
        graphData: []
      };
    }
  };
  
  
  


  export const AdminDashboard = (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            ////console.log("Auth data ", authData)
            let userid = authData.user.id;
            
            let totalDownloads = await uniqueDownloads(30);
            let dailyActiveUsers = await fetchLoginActivity()
            const free = await db.user.count({
              where: {
                id: { [Op.gte]: 0 }
              }
            });

            let users = await db.user.findAll({
              limit: 8
            })
            const totalDatesPlanned = await db.Booking.count();

            // Count total number of unique users who planned dates
            const totalUniqueUsers = await db.Booking.count({
                distinct: true,
                col: 'userId'
            });
            let usersRes = await UserProfileLiteResource(users)
            res.send({ status: true, message: "Dashboard ", data: {downloads: totalDownloads, active_users: dailyActiveUsers, 
              paying: 0, free: free, recent_users: usersRes, planned_dates: totalDatesPlanned, unique_users_planned_dates: totalUniqueUsers} })
            
            

        }
        else {
            res.send({ status: false, message: "Unauthenticated user", data: null })
        }
    })
}

export const getReportedUsers = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
      if (error) {
          return res.status(403).send({ status: false, message: 'Unauthenticated user', data: null });
      }

      try {
        const query = `
        SELECT 
            ru.id AS reportId,
            ru.reportReason,
            ru.createdAt,
            ru.updatedAt,
            ru.reportedUserId,
            ru.reportingUserId,
            reportedUser.first_name AS reportedUserFirstName,
            reportedUser.last_name AS reportedUserLastName,
            reportedUser.profile_image AS reportedUserProfileImage,
            reportingUser.first_name AS reportingUserFirstName,
            reportingUser.last_name AS reportingUserLastName,
            reportingUser.profile_image AS reportingUserProfileImage
        FROM ReportedUsers ru
        INNER JOIN Users reportedUser ON ru.reportedUserId = reportedUser.id
        INNER JOIN Users reportingUser ON ru.reportingUserId = reportingUser.id
    `;

    const result = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });

            const reportedUsers = result.map(row => ({
                reportId: row.reportId,
                reportReason: row.reportReason,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
                reportedUserId: row.reportedUserId,
                reportingUserId: row.reportingUserId,
                reportedUser: {
                    id: row.reportedUserId,
                    first_name: row.reportedUserFirstName,
                    last_name: row.reportedUserLastName,
                    profile_image: row.reportedUserProfileImage
                },
                reportingUser: {
                    id: row.reportingUserId,
                    first_name: row.reportingUserFirstName,
                    last_name: row.reportingUserLastName,
                    profile_image: row.reportingUserProfileImage
                }
            }));


          res.send({ status: true, message: 'Reported users fetched successfully', data: reportedUsers });
      } catch (err) {
          console.error('Error fetching reported users:', err);
          res.status(500).send({ status: false, message: 'An error occurred while fetching reported users', error: err.message });
      }
  });
};

export const getBlockedUsers = async (req, res) => {
  // const token = req.headers.authorization.split(' ')[1]; // Assuming the token is sent in the Authorization header

  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
      if (error) {
          console.error('JWT verification error:', error);
          return res.status(403).send({ status: false, message: 'Unauthenticated user', data: null });
      }

      try {
          const query = `
              SELECT 
                  bu.id AS blockId,
                  bu.blockReason,
                  bu.createdAt,
                  bu.updatedAt,
                  bu.blockedUserId,
                  bu.blockingUserId,
                  blockedUser.id AS blockedUserId,
                  blockedUser.first_name AS blockedUserFirstName,
                  blockedUser.last_name AS blockedUserLastName,
                  blockedUser.profile_image AS blockedUserProfileImage,
                  blockingUser.id AS blockingUserId,
                  blockingUser.first_name AS blockingUserFirstName,
                  blockingUser.last_name AS blockingUserLastName,
                  blockingUser.profile_image AS blockingUserProfileImage
              FROM BlockedUsers bu
              INNER JOIN Users blockedUser ON bu.blockedUserId = blockedUser.id
              INNER JOIN Users blockingUser ON bu.blockingUserId = blockingUser.id
          `;

          const result = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });

          const blockedUsers = result.map(row => ({
              blockId: row.blockId,
              blockReason: row.blockReason,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
              blockedUserId: row.blockedUserId,
              blockingUserId: row.blockingUserId,
              blockedUser: {
                  id: row.blockedUserId,
                  first_name: row.blockedUserFirstName,
                  last_name: row.blockedUserLastName,
                  profile_image: row.blockedUserProfileImage
              },
              blockingUser: {
                  id: row.blockingUserId,
                  first_name: row.blockingUserFirstName,
                  last_name: row.blockingUserLastName,
                  profile_image: row.blockingUserProfileImage
              }
          }));

          res.send({ status: true, message: 'Blocked users fetched successfully', data: blockedUsers });
      } catch (err) {
          console.error('Error fetching blocked users:', err);
          res.status(500).send({ status: false, message: 'An error occurred while fetching blocked users', error: err.message });
      }
  });
};

export const GetUsers = (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
      if (authData) {

        // let updated = await db.user.update({status: 'active'}, {where: {status: null}})
          let userid = authData.user.id;
          let offset = 0;
          if (typeof req.query.offset !== 'undefined') {
              offset = req.query.offset;
          }
          let searchQuery = {};
          if (req.query.search) {
              const searchTerm = req.query.search;
              searchQuery = {
                  [Op.or]: [
                      { first_name: { [Op.like]: `%${searchTerm}%` } },
                      { last_name: { [Op.like]: `%${searchTerm}%` } },
                      { email: { [Op.like]: `%${searchTerm}%` } }
                  ]
              };
          }
          try {
              const users = await db.user.findAll({
                  where: {
                      role: {
                          [Op.ne]: 'admin'
                      },
                      status: 'active',
                      ...searchQuery
                  },
                  offset: Number(offset),
                  limit: 100
              });

              if (users.length > 0) {
                  let userProfiles = await UserProfileLiteResource(users); // Ensure this function is defined in your project
                  res.send({ status: true, message: "Profiles found", data: userProfiles });
              } else {
                  res.send({ status: false, message: "No profiles found", data: null });
              }
          } catch (err) {
              console.error('Error fetching user profiles:', err);
              res.status(500).send({ status: false, message: 'An error occurred while fetching profiles.', error: err.message });
          }
      } else if (error) {
          console.error('JWT verification error:', error);
          res.send({ status: false, message: 'Unauthenticated user', data: null });
      } else {
          res.send({ status: false, message: 'Unauthenticated user', data: null });
      }
  });
};




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
        let mailOptions = {
            from: '"Plurawl" salman@e8-labs.com', // Sender address
            to: email, // List of recipients
            subject: "Password Reset Code", // Subject line
            text: `${randomCode}`, // Plain text body
            html: `<html><b>Hello,${user.first_name}</b>This is your reset code. <b>${randomCode}</b> </html>`, // HTML body
        };

        // Send mail with defined transport object
        try {
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    res.send({ status: false, message: "Code not sent" })
                    //console.log(error);
                }
                else{
                  res.send({ status: true, message: "Code sent" })
                }

                //console.log('Message sent: %s', info.messageId);
                //console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
                

            });
        }
        catch (error) {
            //console.log("Exception ", error)
        }
    }
    else {
        res.send({ status: false, data: null, message: "No such user" })
    }
}



export const deleteUserById = (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
      if (authData) {
          const adminUserId = authData.user.id; // User making the request
          const userIdToDelete = req.body.userId; // User being deleted

          try {
              // Check if the requesting user is an admin
              const adminUser = await db.user.findByPk(adminUserId);
              if (!adminUser || adminUser.role !== 'admin') {
                  return res.status(403).send({ status: false, message: 'You are not authorized to perform this action.' });
              }

              // Check if the user to be deleted exists
              const userToDelete = await db.user.findByPk(userIdToDelete);
              if (!userToDelete) {
                  return res.status(404).send({ status: false, message: 'User not found.' });
              }

              // Delete the user
              // await db.user.destroy({
              //     where: {
              //         id: userIdToDelete
              //     }
              // });

              await db.user.update({status: "deleted"}, {where: {
                id: userIdToDelete
              }})

              res.send({ status: true, message: 'User deleted successfully.' });
          } catch (err) {
              console.error('Error deleting user:', err);
              res.status(500).send({ status: false, message: 'An error occurred while deleting the user.', error: err.message });
          }
      } else if (error) {
          console.error('JWT verification error:', error);
          res.send({ status: false, message: 'Unauthenticated user', data: null });
      } else {
          res.send({ status: false, message: 'Unauthenticated user', data: null });
      }
  });
};

export const suspendUserById = (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
      if (authData) {
          const adminUserId = authData.user.id; // User making the request
          const userIdToSuspend = req.body.userId; // User being suspended

          try {
              // Check if the requesting user is an admin
              const adminUser = await db.user.findByPk(adminUserId);
              if (!adminUser || adminUser.role !== 'admin') {
                  return res.status(403).send({ status: false, message: 'You are not authorized to perform this action.' });
              }

              // Check if the user to be suspended exists
              const userToSuspend = await db.user.findByPk(userIdToSuspend);
              if (!userToSuspend) {
                  return res.status(404).send({ status: false, message: 'User not found.' });
              }

              // Suspend the user
              userToSuspend.status = 'suspended';
              await userToSuspend.save();

              res.send({ status: true, message: 'User suspended successfully.', data: userToSuspend });
          } catch (err) {
              console.error('Error suspending user:', err);
              res.status(500).send({ status: false, message: 'An error occurred while suspending the user.', error: err.message });
          }
      } else if (error) {
          console.error('JWT verification error:', error);
          res.send({ status: false, message: 'Unauthenticated user', data: null });
      } else {
          res.send({ status: false, message: 'Unauthenticated user', data: null });
      }
  });
};