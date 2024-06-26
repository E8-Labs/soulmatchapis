import { Expo } from 'expo-server-sdk';
import db from '../models/index.js'

// Create a new Expo SDK client


export const sendNot = async(to, title, body, data) => {
    let expo = new Expo();
    const message = {
        to: to,//"ExponentPushToken[_pZ2Y6LPv7S9gKi2lJwzif]",
        sound: 'default',
        title: title,//'Test Notification',
        body: body,//'This is a test notification message',
        data: data,//{ message: 'This is a test notification message' },
    };

    try {
        // Send the notification
        let receipts = await expo.sendPushNotificationsAsync([message]);
        //console.log(receipts);
        return { status: true, message: 'Notification sent successfully', data: receipts };
    } catch (error) {
        console.error(error);
        return { status: false, message: 'Failed to send notification', error: error.message }
        // res.status(500).send({ status: false, message: 'Failed to send notification', error: error.message });
    }
}


export const sendNotWithUser = async(to, title, body, data) => {
    let expo = new Expo();
    let user = await db.user.findByPk(to)
    if(user && user.fcm_token){
        const message = {
            to: user.fcm_token,//"ExponentPushToken[_pZ2Y6LPv7S9gKi2lJwzif]",
            sound: 'default',
            title: title,//'Test Notification',
            body: body,//'This is a test notification message',
            data: data,//{ message: 'This is a test notification message' },
        };
    
        try {
            // Send the notification
            let receipts = await expo.sendPushNotificationsAsync([message]);
            //console.log(receipts);
            return { status: true, message: 'Notification sent successfully', data: receipts };
        } catch (error) {
            console.error(error);
            return { status: false, message: 'Failed to send notification', error: error.message }
            // res.status(500).send({ status: false, message: 'Failed to send notification', error: error.message });
        }
    }
    else{
        return { status: false, message: 'Failed to send notification', error: "No such user " + to }
    }
}