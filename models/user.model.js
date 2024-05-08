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
      
      profile_image: {
        type: Sequelize.STRING,
        default: ''
      },
      intro_video: {
        type: Sequelize.STRING,
        default: ''
      },
      company: {
        type: Sequelize.STRING,
        default: ''
      },
      title: {
        type: Sequelize.STRING,
        default: ''
      },
      industry: {
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
      gender:{
        type:Sequelize.STRING,
        values: ['Male', 'Female', 'None'],
        default: 'Male'
      },
      race:{
        type:Sequelize.STRING,
        default: ''// ethnicity
      },
      lgbtq:{
        type:Sequelize.STRING,
        default: ''// yes, no, prefer not to say
      },
      veteran:{
        type:Sequelize.STRING,
        default: ''// yes, no, prefer not to say
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
      points: {
        type: Sequelize.INTEGER,
        default: 0
      },
      enc_key: {
        type: Sequelize.BLOB,
        allowNull: true
      },
      enc_iv: { //initialization vector
        type: Sequelize.BLOB,
        allowNull: true
      },
      countries: {
        type: Sequelize.STRING,
        default: ""
      },
      pronouns: {
        type: Sequelize.STRING,
        default: ""
      },
      dob: {
        type: Sequelize.STRING,
        default: ""
      },
      points:{
        type: Sequelize.DOUBLE,
        allowNull: false,
        defaultValue: 0
      }
      
    }, 
    // {
    //   associate: function(models) {
    //     User.hasMany(models.PlaidTokens, { onDelete: 'cascade' });
    //   }
    // }
    );
  
    return User;
  };

  export default UserModel;