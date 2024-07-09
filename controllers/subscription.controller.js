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

export const AppleSubscriptionWebhook = async (req, res) => {
    const notification = req.body;

    if (!notification) {
        return res.status(400).send('No notification body');
    }

    const { latest_receipt_info, notification_type } = notification;
    const originalTransactionId = latest_receipt_info.original_transaction_id;
    const productId = latest_receipt_info.product_id;
    const purchaseDate = new Date(latest_receipt_info.purchase_date);
    const expiryDate = new Date(latest_receipt_info.expires_date);

    // Find the user by the original transaction ID
    let user = await db.user.findOne({ where: { originalTransactionId } });

    if (!user) {
        return res.status(404).send('User not found');
    }

    let subscription = await db.Subscription.findOne({ where: { userId: user.id, plan: productId } });

    switch (notification_type) {
        case 'INITIAL_BUY':
            if (!subscription) {
                subscription = await db.Subscription.create({
                    userId: user.id,
                    plan: productId,
                    status: 'active',
                    startDate: purchaseDate,
                    endDate: expiryDate,
                });
            } else {
                subscription.status = 'active';
                subscription.plan = productId;
                subscription.startDate = purchaseDate;
                subscription.endDate = expiryDate;
                await subscription.save();
            }
            await db.SubscriptionHistory.create({
                subscriptionId: subscription.id,
                status: 'active',
                changeDate: new Date(),
            });
            user.subscriptionStatus = 'active';
            break;

        case 'DID_RENEW':
            if (subscription) {
                subscription.status = 'renewed';
                subscription.endDate = expiryDate;
                await subscription.save();
                await db.SubscriptionHistory.create({
                    subscriptionId: subscription.id,
                    status: 'renewed',
                    changeDate: new Date(),
                });
                user.subscriptionStatus = 'renewed';
            }
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

    await user.save();
    res.status(200).send('Notification received');
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

    if (!response.ok) {
        throw new Error('Failed to verify receipt');
    }

    const data = await response.json();
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
