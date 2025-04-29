const { Sequelize } = require('sequelize');

const db = new Sequelize('u958879414_pos', 'u958879414_pos', 'Janda123!@#', {
  host: 'srv1998.hstgr.io',
  dialect: 'mysql',
  timezone: '+07:00',
  logging: console.log,
});

module.exports = db;

//db lama 'kasirkujs'

//deploy
// Hostname:
// localhost
// Database:
// brabsenm_kasir
// Username:
// brabsenm_kasir
// Password:
// E2NUUQGaZWkQPneWQhQ4

// deployv2
// Hostname:
// localhost
// Database:
// brabsenm_kasirv2
// Username:
// brabsenm_kasirv2
// Password:
// eUMVUMNhtjfyXwtCDww8
