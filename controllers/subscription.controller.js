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
import { createThumbnailAndUpload, uploadMedia, deleteFileFromS3 } from '../utilities/storage.js'
import crypto from 'crypto'
import { verifyAppleSignedData } from "../services/subscriptionService.js";
// import { fetchOrCreateUserToken } from "./plaid.controller.js";
// const fs = require("fs");
// var Jimp = require("jimp");
// require("dotenv").config();
const User = db.user;
const Op = db.Sequelize.Op;


import fetch from 'node-fetch';
import base64 from 'base-64';

const APPLE_RECEIPT_URL = 'https://buy.itunes.apple.com/verifyReceipt'; // For production
const APPLE_SANDBOX_RECEIPT_URL = 'https://sandbox.itunes.apple.com/verifyReceipt'; // For sandbox

const APPLE_SHARED_SECRET = process.env.APPLE_SHARED_SECRET;//'your_shared_secret'; // Replace with your actual shared secret


import UserRole from "../models/userrole.js";

import UserProfileFullResource from "../resources/userprofilefullresource.js";
import NotificationResource from "../resources/notification.resource.js";
import { createNotification } from "../utilities/notificationutility.js";
import { Sequelize } from "sequelize";
import { sendNot, sendNotWithUser } from "./push.controller.js";


export const StoreReceipt = async (req, res) => {

    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {

            const { receipt, useSandbox } = req.body; // Ensure you pass the receipt and sandbox flag

            try {
                const originalTransactionId = await extractOriginalTransactionIdFromAppleReceipt(receipt, useSandbox);

                // Find or create the user by some unique identifier (e.g., email, userId)
                const user = await db.user.findOne({ where: { email: req.body.email } });

                if (!user) {
                    // return res.status(404).send('User not found');
                    return res.send({ status: false, message: 'User not found', data: null });
                }

                // Update the user with the originalTransactionId
                user.originalTransactionId = originalTransactionId;
                await user.save();

                let userRes = await UserProfileFullResource(user)
                return res.send({ status: true, message: 'User transaction id updated', data: userRes });
            } catch (error) {
                return res.send({ status: false, message: error.message, data: null });
            }

        }

    })

}


//   const express = require('express');
// const router = express.Router();
// const { User, Subscription, SubscriptionHistory } = require('../models');


//Sandbox mode
export const AppleSubscriptionWebhook = async (req, res) => {
    const notification = req.body;
// console.log("Notficatiion rev cat ", notification)
    if (!notification) {
        return res.status(400).send('No notification body');
    }

    try {
        let originalTransactionId;
        let productId;
        let purchaseDate;
        let expiresDate;
        let notificationType;

        // Determine if notification is v1 or v2
        // if (notification.version && notification.version === "2.0") {
            // v2 notification
            // const signedTransactionInfo = notification.data.signedTransactionInfo;
            const data = await verifyAppleSignedData(notification.signedPayload);
            
            const transactionInfo = await verifyAppleSignedData(data.data.signedTransactionInfo);
            const renewalInfo = await verifyAppleSignedData(data.data.signedRenewalInfo);
            console.log("Transaction info ", transactionInfo)
            console.log("Renewal info ", renewalInfo)
            originalTransactionId = transactionInfo.originalTransactionId;
            productId = transactionInfo.productId;
            purchaseDate = transactionInfo.purchaseDate;
            expiresDate = transactionInfo.expiresDate;
            notificationType = data.notificationType;
            console.log("Not Type ", notificationType)
        // } else {
        //     // v1 notification
        //     originalTransactionId = notification.latest_receipt_info.original_transaction_id;
        //     productId = notification.latest_receipt_info.product_id;
        //     purchaseDate = notification.latest_receipt_info.purchase_date;
        //     expiresDate = notification.latest_receipt_info.expires_date;
        //     notificationType = notification.notification_type;
        // }

        const user = await User.findOne({ where: { originalTransactionId } });

        if (!user) {
            // return res.status(404).send('User not found');
            console.log("User not found")
        }

        let subscription = await db.Subscription.findOne({ where: { original_transaction_id: originalTransactionId, plan: productId } });

        switch (notificationType) {
            case 'INITIAL_BUY':
            case 'DID_RENEW':
                case 'SUBSCRIBED':
                if (!subscription) {
                    subscription = await db.Subscription.create({
                        // userId: user.id,
                        original_transaction_id: originalTransactionId,
                        plan: productId,
                        status: 'active',
                        startDate: new Date(purchaseDate),
                        endDate: new Date(expiresDate),
                    });
                } else {
                    subscription.status = 'renewed';
                    subscription.endDate = new Date(expiresDate);
                    await subscription.save();
                }
                await db.SubscriptionHistory.create({
                    subscriptionId: subscription.id,
                    status: 'renewed',
                    changeDate: new Date(),
                });
                user.subscriptionStatus = 'renewed';
                break;

            case 'CANCEL':
                if (subscription) {
                    subscription.status = 'canceled';
                    await subscription.save();
                    await db.SubscriptionHistory.create({
                        subscriptionId: subscription.id,
                        status: 'canceled',
                        changeDate: new Date(),
                    });
                    user.subscriptionStatus = 'canceled';
                }
                break;

            // Add more cases as needed
        }

        // await user.save();
        res.status(200).send('Notification received');
    } catch (error) {
        console.error('Failed to process notification:', error);
        res.status(500).send('Failed to process notification');
    }
}






async function verifyReceipt(receipt, useSandbox = false) {
    const url = useSandbox ? APPLE_SANDBOX_RECEIPT_URL : APPLE_RECEIPT_URL;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'receipt-data': receipt,
        'password': APPLE_SHARED_SECRET,
      }),
    });
  console.log("Response from receipt verification ")
  const data = await response.json();
  console.log(data)
    if (!response.ok) {
      throw new Error('Failed to verify receipt');
    }
  
    
    return data;
  }

  async function extractOriginalTransactionIdFromAppleReceipt(receipt, useSandbox = false) {
    try {
      const response = await verifyReceipt(receipt, useSandbox);
  
      if (response.status !== 0) {
        throw new Error('Receipt verification failed');
      }
  
      const latestReceiptInfo = response.latest_receipt_info || response.receipt.in_app;
  
      if (!latestReceiptInfo || latestReceiptInfo.length === 0) {
        throw new Error('No in-app purchase found in the receipt');
      }
  
      // Assuming we need the original transaction ID of the latest transaction
      const originalTransactionId = latestReceiptInfo[0].original_transaction_id;
  
      return originalTransactionId;
    } catch (error) {
      console.error('Failed to extract original transaction ID:', error);
      throw error;
    }
  }

// module.exports = extractOriginalTransactionIdFromAppleReceipt;
