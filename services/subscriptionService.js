import db from '../models/index.js';
const Op  = db.Sequelize.Op
import moment from 'moment';
import jwt from 'jsonwebtoken'; // Install this package

export async function getSubscriptionDetails(userId) {
  const user = await db.user.findByPk(userId);

  if (!user) {
    throw new Error('User not found');
  }

  const subscription = await db.Subscription.findOne({
    where: {
      userId: user.id,
      endDate: {
        [Op.gte]: new Date(),
      },
      status: { 
        [Op.in]: ['active', 'renewed'],
      },
    },
  });

  if (!subscription) {
    return {
      isSubscribed: false,
      subscriptionDetails: null,
    };
  }

  return {
    isSubscribed: true,
    subscriptionDetails: {
      plan: subscription.plan,
      price: subscription.price,
      startDate: moment(subscription.startDate).format('MM-DD-YYYY'),
      endDate: subscription.endDate ? moment(subscription.endDate).format('MM-DD-YYYY') : null,
      status: subscription.status,
      nextReceiptDate: subscription.nextReceiptDate ? moment(subscription.nextReceiptDate).format('MM-DD-YYYY') : null,
    },
  };
}




export async function verifyAppleSignedData(signedData) {
  // This is a simplified example. You will need Apple's public keys to verify the JWT
  const decoded = jwt.decode(signedData, { complete: true });
  
  if (!decoded) {
    throw new Error('Failed to decode signed data');
  }

  // Here, you should verify the JWT signature using Apple's public keys
  // For simplicity, this example does not include actual verification logic
  
  return decoded.payload;
}

// module.exports = verifyAppleSignedData;