import db from "../models/index.js";

export const createNotification = async (from, to, itemId, notification_type, message) => {
    // const { UserId, actionType, itemId, message } = req.body;

    try {
        const notification = await db.NotificationModel.create({
            from: from,
            to: to,
            itemId: itemId,
            notification_type: notification_type,
            is_read: false,
            message: message
        });
        return { status: true, message: 'Notification created successfully.', data: notification }
        // res.send({ status: true, message: 'Notification created successfully.', data: notification });
    } catch (err) {
        console.error('Error creating notification:', err);
        return { status: false, message: 'An error occurred while creating the notification.', error: err.message }
        // res.status(500).send({ status: false, message: 'An error occurred while creating the notification.', error: err.message });
    }
};