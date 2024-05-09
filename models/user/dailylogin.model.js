let DailyLoginModel = (sequelize, Sequelize) => {
    const Cost = sequelize.define("DailyLogin", {
      type: {
        type: Sequelize.STRING(200)
      },
      
    });
    return Cost;
  };
  export default DailyLoginModel;