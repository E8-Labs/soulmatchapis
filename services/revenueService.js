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






const getCurrentYearSubscriptionData = async () => {
  const currentYear = new Date().getFullYear();
  const startDate = new Date(currentYear, 0, 1); // January 1st of the current year
  const endDate = new Date(currentYear + 1, 0, 1); // January 1st of the next year

  const query = `
      SELECT 
          DATE_FORMAT(sh.changeDate, '%m-%Y') AS month,
          COUNT(DISTINCT CASE WHEN s.plan = 'free' THEN s.id END) AS freeUsers,
          COUNT(DISTINCT CASE WHEN s.plan = 'WeeklySubscriptionSoulmatch0623' THEN s.id END) AS weeklyUsers,
          COUNT(DISTINCT CASE WHEN s.plan = 'MonthlySubscriptionSoulmatch0623' THEN s.id END) AS monthlyUsers,
          COUNT(DISTINCT CASE WHEN s.plan = 'YearlySubscriptionSoulmatch0623' THEN s.id END) AS yearlyUsers
      FROM 
          SubscriptionHistories AS sh
      JOIN 
          Subscriptions AS s ON sh.subscriptionId = s.id
      WHERE 
          sh.changeDate BETWEEN :startDate AND :endDate
      GROUP BY 
          DATE_FORMAT(sh.changeDate, '%m-%Y')
      ORDER BY 
          sh.changeDate ASC;
  `;

  try {
      const results = await db.sequelize.query(query, {
          replacements: { startDate, endDate },
          type: db.sequelize.QueryTypes.SELECT
      });

      return results;
  } catch (error) {
      console.error('Error fetching current year subscription data:', error);
      throw error;
  }
};

export const fetchCurrentYearSubscriptionData = async () => {
  const data = await getCurrentYearSubscriptionData();
  console.log(data);
  return data
};



const getTotalUsersAndPayingUsers = async () => {
  const query = `
      SELECT 
          (SELECT COUNT(*) FROM Subscriptions) AS totalUsers,
          (SELECT COUNT(*) FROM Subscriptions WHERE plan IN ('WeeklySubscriptionSoulmatch0623', 'MonthlySubscriptionSoulmatch0623', 'YearlySubscriptionSoulmatch0623')) AS totalPayingUsers
  `;

  try {
      const results = await db.sequelize.query(query, {
          type: db.sequelize.QueryTypes.SELECT
      });

      return results[0];
  } catch (error) {
      console.error('Error fetching total users and total paying users:', error);
      throw error;
  }
};

export const fetchTotalPayingUsers = async () => {
  const data = await getTotalUsersAndPayingUsers();
  console.log(data);
  return data.totalPayingUsers
};

// export default {
//   getMonthlyRevenueData, fetchSubscriptionsData
// };
