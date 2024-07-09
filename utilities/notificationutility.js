import db from "../models/index.js";
import { sendNotWithUser } from "../controllers/push.controller.js";
import NotificationType from "../models/user/notificationtype.js";


function getTitleForNotification(type){
    if(type === NotificationType.TypeNewUser){
        return "New User"
    }
    if(type === NotificationType.TypeDateInvite){
        return "Date Invite"
    }
    if(type === NotificationType.TypeLike){
        return "New Like"
    }
    if(type === NotificationType.TypeMatch){
        return "New Match"
    }
    if(type === NotificationType.TypeMessage){
        return "New Message"
    }
    // if(type === NotificationType.TypeDislike){
    //     return "Dislike"
    // }
}
function getSubtitleForNotification(type, from){
    if(type === NotificationType.TypeNewUser){
        return `${from.first_name} registered on Soulmatch`
    }
    if(type === NotificationType.TypeDateInvite){
        return `${from.first_name} invited you to a date`
    }
    if(type === NotificationType.TypeLike){
        return `${from.first_name} liked your profile`
    }
    if(type === NotificationType.TypeMatch){
       return `You've got a new match`
    }
    if(type === NotificationType.TypeMessage){
        return `${from.first_name} sent you a message`
    }
    // if(type === NotificationType.TypeDislike){
    //     return "Dislike"
    // }
}


export const createNotification = async (from, to, itemId, notification_type, message) => {
    // const { UserId, actionType, itemId, message } = req.body;
    let fromUser = await db.user.findByPk(from)
    try {
        const notification = await db.NotificationModel.create({
            from: from,
            to: to,
            itemId: itemId,
            notification_type: notification_type,
            is_read: false,
            message: message
        });
        let sent = sendNotWithUser(to, getTitleForNotification(notification_type), getSubtitleForNotification(notification_type, fromUser), 
            {type: notification_type, data: notification})
        return { status: true, message: 'Notification created successfully.', data: notification }
        // res.send({ status: true, message: 'Notification created successfully.', data: notification });
    } catch (err) {
        console.error('Error creating notification:', err);
        return { status: false, message: 'An error occurred while creating the notification.', error: err.message }
        // res.status(500).send({ status: false, message: 'An error occurred while creating the notification.', error: err.message });
    }
};