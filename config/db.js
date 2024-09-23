const { Sequelize } = require('sequelize');

// Configuración de la conexión a SQL Server
const sequelize = new Sequelize('BDFoto', 'lgrservices', '$$LixandroGomez', {
  host: 'dblixandro.database.windows.net',   // Cambia si es un servidor remoto
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: true, // Si usas Azure, debes usar 'encrypt: true'
    }
  }
});

module.exports = sequelize;