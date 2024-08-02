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
import pusher from '../utilities/pusher.js'
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
import {
  fetchSubscriptionsData, fetchMonthlyRevenue,
  fetchCurrentYearSubscriptionData, fetchTotalPayingUsers,
  getMonthlyRevenueBoost
} from "../services/revenueService.js";
import { SendUserSuspendedDeletedEmail } from "../services/emailService.js";




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
    //   //console.log("DA Users ", dailyUsersResult)

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
    //console.log("DA Users ", dailyLoginData)

    // Create an array of all dates from startDate to endDate
    let dateArray = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dateArray.push(new Date(d));
    }
    //console.log("Date array ", dateArray)
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
      //////console.log("Auth data ", authData)
      let userid = authData.user.id;

      let monthlySubscriptionsData = await fetchSubscriptionsData("monthly")
      let weeklySubscriptionsData = await fetchSubscriptionsData("weekly")
      let yearlySubscriptionsData = await fetchSubscriptionsData("yearly")
      let subscriptionsData = { monthly: monthlySubscriptionsData, yearly: yearlySubscriptionsData, weekly: weeklySubscriptionsData }

      const profileBoostRevenue = await getMonthlyRevenueBoost()

      let monthlyRevenueData = await fetchMonthlyRevenue("monthly")
      let weeklyRevenueData = await fetchMonthlyRevenue("weekly")
      let yearlyRevenueData = await fetchMonthlyRevenue("yearly")
      let revenueData = { monthly: monthlyRevenueData, yearly: yearlyRevenueData, weekly: weeklyRevenueData }


      let payingAndFree = await fetchCurrentYearSubscriptionData();
      let payingUsersData = await fetchTotalPayingUsers()

      // console.log("Sub data ", subscriptionsData)
      // let totalDownloads = await uniqueDownloads(30);
      // let dailyActiveUsers = await fetchLoginActivity()
      const total = await db.user.count({
        where: {
          id: { [Op.gte]: 0 },
          status: "active"
        }
      });

      let users = await db.user.findAll({
        where: {
          status: 'active'
        },
        limit: 8
      })
      const totalDatesPlanned = await db.Booking.count();

      // Count total number of unique users who planned dates
      const totalUniqueUsers = await db.Booking.count({
        distinct: true,
        col: 'userId'
      });
      let usersRes = await UserProfileLiteResource(users)
      res.send({
        status: true, message: "Dashboard ", data: {
          subscriptionsData: subscriptionsData,
          revenueData: revenueData,
          payingAndFree: payingAndFree,
          boostRevenue: profileBoostRevenue,
          paying: payingUsersData, free: total - payingUsersData,
          recent_users: usersRes,
          planned_dates: totalDatesPlanned, unique_users_planned_dates: totalUniqueUsers
        }
      })



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
      let city = req.query.city
      let state = req.query.state
      let plan = req.query.plan
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
      // if (city) {
      //   searchQuery.city = { [Op.like]: `%${city}%` }//city;
      // }

      // if (state) {
      //   searchQuery.state = { [Op.like]: `%${state}%` }//state;
      // }
      const orConditions = [];

      if (city) {
        orConditions.push({ city: { [Op.like]: `%${city}%` } });
      }

      if (state) {
        orConditions.push({ state: { [Op.like]: `%${state}%` } });
      }

      if (orConditions.length > 0) {
        if (searchQuery[Op.or]) {
          searchQuery[Op.or].push({ [Op.or]: orConditions });
        } else {
          searchQuery[Op.or] = orConditions;
        }
      }
      if (plan) {
        searchQuery.plan_status = plan;
      }
      searchQuery.role = { [Op.ne]: 'admin' }
      searchQuery.status = 'active'
      console.log("Search query is ", searchQuery)
      try {
        const users = await db.user.findAll({
          where: searchQuery,
          offset: Number(offset),
          order: [["first_name", "ASC"]],
          limit: 100
        });

        const total = await db.user.count({
          where: {
            id: { [Op.gte]: 0 },
            status: "active"
          }
        });
        if (users.length > 0) {
          let userProfiles = await UserProfileLiteResource(users); // Ensure this function is defined in your project
          res.send({ status: true, message: "Profiles found", data: userProfiles, totalUsers: total });
        } else {
          res.send({ status: false, message: "No profiles found", data: null, totalUsers: total });
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
      from: '"Soulmatch" salman@e8-labs.com', // Sender address
      to: email, // List of recipients
      subject: "Password Reset Code", // Subject line
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
            background-color: #007BFF;
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
            background-color: #007BFF;
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
            <h1>Password Reset</h1>
        </div>
        <div class="content">
            <p><strong>Hello, ${user.first_name}</strong></p>
            <p>This is your reset code:</p>
            <div class="code">${randomCode}</div>
        </div>
        <div class="footer">
            <p>If you did not request a password reset, please ignore this email. If you have any questions, please <a href="mailto:salman@e8-labs.com">contact us</a>.</p>
        </div>
    </div>
</body>
</html>
`, // HTML body
    };

    // Send mail with defined transport object
    try {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          res.send({ status: false, message: "Code not sent" })
          ////console.log(error);
        }
        else {
          res.send({ status: true, message: "Code sent" })
        }

        ////console.log('Message sent: %s', info.messageId);
        ////console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));


      });
    }
    catch (error) {
      ////console.log("Exception ", error)
    }
  }
  else {
    res.send({ status: false, data: null, message: "No such user" })
  }
}

export const IgnoreFlaggedUser = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      try {
        // Check if the requesting user is an admin
        const adminUserId = authData.user.id;
        const adminUser = await db.user.findByPk(adminUserId);
        if (!adminUser || adminUser.role !== 'admin') {
          return res.status(403).send({ status: false, message: 'You are not authorized to perform this action.' });
        }

        // Check if the user to be deleted exists
        const userToDelete = await db.ReportedUsers.findByPk(req.body.reportid);
        if (!userToDelete) {
          return res.status(404).send({ status: false, message: 'Report not found.' });
        }

        let del = await db.ReportedUsers.destroy({
          where: {
            id: req.body.reportid
          }
        })

        res.send({ status: true, message: 'Report ignored successfully.' });
      } catch (err) {
        console.error('Error ignoring report:', err);
        res.status(500).send({ status: false, message: 'An error occurred while ignoring the report.', error: err.message });
      }
    }
  })
}

export const deleteUserById = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      const adminUserId = authData.user.id; // User making the request
      const userIdToDelete = req.body.userId; // User being deleted
      let permanent = req.body.permanentDelete || false
      let transaction;

      try {
        // transaction = await db.sequelize.transaction();

        // Check if the requesting user is an admin
        const adminUser = await db.user.findByPk(adminUserId);
        if (!adminUser || adminUser.role !== 'admin') {
          // await transaction.rollback();
          return res.status(403).send({ status: false, message: 'You are not authorized to perform this action.' });
        }

        // Check if the user to be deleted exists
        const userToDelete = await db.user.findByPk(userIdToDelete);
        if (!userToDelete) {
          // await transaction.rollback();
          return res.status(404).send({ status: false, message: 'User not found.' });
        }

        // Delete all the data of the user
        await db.profileLikes.destroy({
          where: {
            [Op.or]: {
              from: userIdToDelete,
              to: userIdToDelete,
            },
          },
          // transaction,
        });

        await db.profileMatches.destroy({
          where: {
            [Op.or]: {
              user_1_id: userIdToDelete,
              user_2_id: userIdToDelete,
            },
          },
          // transaction,
        });

        await db.ReportedUsers.destroy({
          where: {
            [Op.or]: {
              reportedUserId: userIdToDelete,
              reportingUserId: userIdToDelete,
            },
          },
          // transaction,
        });

        await db.BlockedUsers.destroy({
          where: {
            [Op.or]: {
              blockedUserId: userIdToDelete,
              blockingUserId: userIdToDelete,
            },
          },
          // transaction,
        });

        await db.NotificationModel.destroy({
          where: {
            [Op.or]: {
              from: userIdToDelete,
              to: userIdToDelete,
            },
          },
          // transaction,
        });

        const chatUsers = await db.ChatUser.findAll({
          where: { UserId: userIdToDelete },
          attributes: ['chatId'],
          raw: true,
          // transaction,
        });

        const chatIds = chatUsers.map((cu) => cu.chatId);

        // Delete all messages associated with the user's chats
        await db.Message.destroy({
          where: { chatId: chatIds },
          // transaction,
        });

        // Delete all ChatUser associations
        await db.ChatUser.destroy({
          where: { UserId: userIdToDelete },
          // transaction,
        });

        // Delete all chats where the user is the only participant
        await db.Chat.destroy({
          where: { id: chatIds },
          // transaction,
        });

        if (permanent) {
          console.log("Permanently deleted")
          await db.userAnswers.destroy({
            where: { userId: userIdToDelete },
            // transaction,
          });
          await db.userMedia.destroy({
            where: { userId: userIdToDelete },
            // transaction,
          });

          await db.user.destroy({
            where: {
              id: userIdToDelete
            }
          })
        }
        else {
          console.log("Temporarily deleted")
          await db.user.update(
            { status: 'deleted' },
            {
              where: {
                id: userIdToDelete,
              },
              // transaction,
            }
          );
        }

        await SendUserSuspendedDeletedEmail({ user: userToDelete, type: 'deleted' });
        if (adminUser.role === "admin") {
          pusher.trigger(`UserDeletedSuspended-${userIdToDelete}`, `deleted`, { message: "User is deleted by admin" });
        }
        // await transaction.commit();

        res.send({ status: true, message: 'User deleted successfully.' });
      } catch (err) {
        if (transaction && !transaction.finished) {
          // await transaction.rollback();
        }

        console.error('Error deleting user:', err);
        res.status(500).send({
          status: false,
          message: 'An error occurred while deleting the user.',
          error: err.message,
        });
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

        await SendUserSuspendedDeletedEmail({ user: userToSuspend, type: "suspended" })
        if (adminUser.role === "admin") {
          pusher.trigger(`UserDeletedSuspended-${userIdToSuspend}`, `suspended`, { message: "User is suspended by admin" });
        }
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