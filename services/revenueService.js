import db from '../models/index.js';
const Op = db.Sequelize.Op

export async function getMonthlyRevenueData() {
  const now = new Date();
  const pastYear = new Date();
  pastYear.setFullYear(now.getFullYear() - 1);

  const subscriptions = await db.SubscriptionHistory.findAll({
    where: {
      changeDate: {
        [Op.between]: [pastYear, now],
      },
      status: {
        [Op.in]: ['active', 'renewed'],
      },
    },
    include: [db.Subscription],
  });

  const monthlyRevenue = {};

  subscriptions.forEach(sub => {
    const month = sub.changeDate.getMonth();
    const year = sub.changeDate.getFullYear();
    const key = `${year}-${month}`;

    if (!monthlyRevenue[key]) {
      monthlyRevenue[key] = 0;
    }

    switch (sub.Subscription.plan) {
      case 'weekly':
        monthlyRevenue[key] += 4; // Assuming weekly plan revenue
        break;
      case 'monthly':
        monthlyRevenue[key] += 1; // Assuming monthly plan revenue
        break;
      case 'yearly':
        monthlyRevenue[key] += 1 / 12; // Assuming yearly plan revenue
        break;
      // Add more plans as needed
    }
  });

  return monthlyRevenue;
}



const getPlanName = (type) => {
  switch (type) {
    case 'weekly':
      return 'WeeklySubscriptionSoulmatch0623';
    case 'monthly':
      return 'MonthlySubscriptionSoulmatch0623';
    case 'yearly':
      return 'YearlySubscriptionSoulmatch0623';
    default:
      throw new Error('Invalid subscription type');
  }
};

const getMonthlySubscriptions = async (subscriptionType) => {
  const planName = getPlanName(subscriptionType);

  const query = `
      SELECT 
          COUNT(*) AS numberOfSubscriptions, 
          DATE_FORMAT(startDate, '%m-%Y') AS date
      FROM 
          Subscriptions
      WHERE
          plan = :planName
      GROUP BY 
          DATE_FORMAT(startDate, '%m-%Y')
      ORDER BY 
          startDate DESC;
  `;

  try {
    const results = await db.sequelize.query(query, {
      replacements: { planName },
      type: db.sequelize.QueryTypes.SELECT
    });

    return results;
  } catch (error) {
    console.error('Error fetching monthly subscriptions:', error);
    throw error;
  }
};

export const fetchSubscriptionsData = async (subscriptionType) => {
  const subscriptions = await getMonthlySubscriptions(subscriptionType);
  console.log(subscriptions);
  return subscriptions
};


const getMonthlyRevenue = async (subscriptionType) => {
  const planName = getPlanName(subscriptionType);

  const query = `
        SELECT 
            DATE_FORMAT(sh.changeDate, '%m-%Y') AS date,
            SUM(
                CASE 
                    WHEN s.plan = 'WeeklySubscriptionSoulmatch0623' THEN 5.99
                    WHEN s.plan = 'MonthlySubscriptionSoulmatch0623' THEN 14.99
                    WHEN s.plan = 'YearlySubscriptionSoulmatch0623' THEN 149.99
                    ELSE 0
                END
            ) AS totalRevenue
        FROM 
            SubscriptionHistories AS sh
        JOIN 
            Subscriptions AS s ON sh.subscriptionId = s.id
        WHERE
            s.plan = :planName
        GROUP BY 
            DATE_FORMAT(sh.changeDate, '%m-%Y')
        ORDER BY 
            sh.changeDate DESC;
    `;

    try {
        const results = await db.sequelize.query(query, {
            replacements: { planName },
            type: db.sequelize.QueryTypes.SELECT
        });

        return results;
    } catch (error) {
        console.error('Error fetching monthly revenue:', error);
        throw error;
    }
};

export const fetchMonthlyRevenue = async (subscriptionType) => {
  const revenue = await getMonthlyRevenue(subscriptionType);
  console.log(revenue);
  return revenue
};



// export default {
//   getMonthlyRevenueData, fetchSubscriptionsData
// };
