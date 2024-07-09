const UserModel = (sequelize, Sequelize) => {
    const User = sequelize.define("User", {
      first_name: {
        type: Sequelize.STRING
      },
      last_name: {
        type: Sequelize.STRING
      },
      
      email: {
        type: Sequelize.STRING
      },
      password: {
        type: Sequelize.STRING
      },
      
      profile_image: { // we store smaller image for fast loading here
        type: Sequelize.STRING,
        default: ''
      },
      full_profile_image: { // we store full size image here
        type: Sequelize.STRING,
        default: ''
        
      },
      intro_video: {
        type: Sequelize.STRING,
        default: ''
      },
      intro_thumbnail_url:{
        type: Sequelize.STRING,
        default: ''
      },
      company: {
        type: Sequelize.STRING,
        default: ''
      },
      job_title: {
        type: Sequelize.STRING,
        default: ''
      },
      age: {
        type: Sequelize.INTEGER,
        default: null
      },
      height_inches: {
        type: Sequelize.INTEGER,
        default: null
      },
      height_feet: {
        type: Sequelize.INTEGER,
        default: null
      },
      zodiac: {
        type: Sequelize.STRING,
        default: ''
      },
      school: {
        type: Sequelize.STRING,
        default: ''
      },
      
      city: {
        type: Sequelize.STRING,
        default: ''
      },
      state: {
        type: Sequelize.STRING,
        default: ''
      },
      lat: {
        type: Sequelize.DOUBLE,
        allowNull: true,
        default: null
      },
      lang: {
        type: Sequelize.DOUBLE,
        allowNull: true,
        default: null
      },
      gender:{
        type:Sequelize.STRING,
        values: ['Male', 'Female', 'None'],
        default: 'Male'
      },
      
      fcm_token:{
        type:Sequelize.STRING,
        default: ''
      },
      device_id:{ // unique for every device
        type:Sequelize.STRING,
        defaultValue: ''
      },
      provider_id: {
        type: Sequelize.STRING,
        default: ''
      },
      provider_name: {
        type: Sequelize.STRING,
        default: 'Email', //Facebook, Apple, Google
      },
      role: {
        type: Sequelize.ENUM,
        values: ['user', 'admin'],
        default: 'user'
      },
      originalTransactionId:{
        type: Sequelize.STRING,
        allowNull: true,
        default: null
      },
      status: {
        type: Sequelize.ENUM,
        values: ['active', 'suspended', 'deleted'],
        default: 'active',
      },
      plan_status: {
        type: Sequelize.ENUM,
        values: ['free', 'monthly', 'yearly', 'weekly'],
        default: 'free',
        allowNull: false
      },
      enc_key: {
        type: Sequelize.BLOB,
        allowNull: true
      },
      enc_iv: { //initialization vector
        type: Sequelize.BLOB,
        allowNull: true
      },
      
      dob: {
        type: Sequelize.STRING,
        default: ""
      },
      
      interested_gender: {
        type: Sequelize.STRING,
      },
      interested_min_age: {
        type: Sequelize.INTEGER,
        // defaultValue: 15
      },
      interested_max_age: {
        type: Sequelize.INTEGER,
        // defaultValue: 60
      }
      
    }, 
    // {
    //   associate: function(models) {
    //     User.hasMany(models.PlaidTokens, { onDelete: 'cascade' });
    //   }
    // }
    );

    User.associate = (models) => {
      User.hasMany(models.Booking, { foreignKey: 'userId', as: 'bookings' });
      User.hasMany(models.Booking, { foreignKey: 'dateUserId', as: 'dateBookings' });
  };
  
    return User;
  };

  export default UserModel;