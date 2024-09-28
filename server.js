const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sequelize = require('./config/db');
const User = require('./models/User');
const Client = require('./models/Client');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const cors = require('cors'); // <--- Agregar esto

const app = express();

// Usar el middleware CORS
app.use(cors()); // <--- Agregar esto
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'lixandrogomezrincon'; // Cambia esto por una clave segura

// Swagger configuration
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Servicios Apis',
      version: '1.0.0',
      description: 'Documentación de la API para el proyecto CRUD',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
      },
    ],
  },
  apis: ['./server.js'], // Aquí debes incluir tu archivo de servidor o las rutas
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/servicio-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Sincronizar la base de datos
sequelize.sync().then(() => {
  console.log('Base de datos sincronizada');
});

// Ruta para registrar usuario
/**
 * @swagger
 * /register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario registrado
 *       500:
 *         description: Error al registrar usuario
 */
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword });
    res.status(201).json({ message: 'Usuario registrado', user });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// Ruta para login
/**
 * @swagger
 * /login:
 *   post:
 *     summary: Iniciar sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso
 *       404:
 *         description: Usuario no encontrado
 *       400:
 *         description: Contraseña incorrecta
 *       500:
 *         description: Error en el login
 */
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Contraseña incorrecta' });
    }
    const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1h' });
    res.status(200).json({ message: 'Login exitoso', token });
  } catch (error) {
    res.status(500).json({ error: 'Error en el login' });
  }
});

// Middleware de autenticación
const authenticate = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado, token faltante' });
  }
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// CRUD de clientes (solo accesible si estás autenticado)
/**
 * @swagger
 * /clients:
 *   post:
 *     summary: Crear un nuevo cliente
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cliente creado
 *       500:
 *         description: Error al crear cliente
 */
app.post('/clients', authenticate, async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const client = await Client.create({ name, email, phone });
    console.log(client);
    res.status(201).json({ message: 'Cliente creado', client });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

/**
 * @swagger
 * /clients:
 *   get:
 *     summary: Obtener la lista de clientes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de clientes
 *       500:
 *         description: Error al obtener clientes
 */
app.get('/clients', authenticate, async (req, res) => {
  try {
    const clients = await Client.findAll();
    res.status(200).json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});



/**
 * @swagger
 * /clients/{id}:
 *   get:
 *     summary: Obtener un cliente por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del cliente
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *       404:
 *         description: Cliente no encontrado
 *       500:
 *         description: Error al obtener el cliente
 */



app.get('/clients/:id', authenticate, async (req, res) => {
  const clientId = req.params.id; // Obtiene el ID del cliente de los parámetros de la ruta
  try {
    const client = await Client.findOne({ where: { id: clientId } }); // Busca el cliente por ID

    if (client) {
      res.status(200).json(client); // Devuelve el cliente encontrado
    } else {
      res.status(404).json({ error: 'Cliente no encontrado' }); // Devuelve un error 404 si no se encuentra el cliente
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el cliente' }); // Devuelve un error 500 si ocurre un error
  }
});



/**
 * @swagger
 * /clients/{id}:
 *   put:
 *     summary: Actualizar un cliente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del cliente
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cliente actualizado
 *       404:
 *         description: Cliente no encontrado
 *       500:
 *         description: Error al actualizar cliente
 */
app.put('/clients/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  try {
    const client = await Client.findByPk(id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    await client.update({ name, email, phone });
    res.status(200).json({ message: 'Cliente actualizado', client });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

/**
 * @swagger
 * /clients/{id}:
 *   delete:
 *     summary: Eliminar un cliente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del cliente
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cliente eliminado
 *       404:
 *         description: Cliente no encontrado
 *       500:
 *         description: Error al eliminar cliente
 */
app.delete('/clients/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const client = await Client.findByPk(id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    await client.destroy();
    res.status(200).json({ message: 'Cliente eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
