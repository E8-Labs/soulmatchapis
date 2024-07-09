import db from '../models';
const  Op = db.Sequelize.Op

async function getMonthlyRevenueData() {
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

module.exports = {
  getMonthlyRevenueData,
};
