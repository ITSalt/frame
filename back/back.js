const bodyParser = require('body-parser');
const restana = require('restana');
const socketio = require('socket.io');
const mariadb = require('mariadb');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const app = restana();
app.use(bodyParser.json({ limit: "4000Kb" }))
app.use(bodyParser.urlencoded({
  extended: true,
  limit: "4000Kb"
}));
const io = socketio(app.server);
const { escape } = require('mysql2');

// Load environment variables from .env file
dotenv.config();

// Get database connection parameters from environment variables
const dbName = process.env.DB_NAME || '';
const dbUser = process.env.DB_USER || '';
const dbPassword = process.env.DB_PASSWORD || '';
const serverPort = process.env.SERVER_PORT || 3000;

// Connect to the MariaDB database
const pool = mariadb.createPool({
  connectionLimit: 10,
  socketPath: "/run/mysqld/mysqld.sock",
  user: dbUser,
  password: dbPassword,
  database: dbName
});

// Function to handle connection loss and automatic reconnection
let connection;

const handleDisconnect = async () => {
  console.log('MariaDB connection lost, attempting to reconnect...');
  try {
    connection = await pool.getConnection();
    console.log(`Reconnected to database success`);
    connection.on('error', handleDisconnect);
  } catch (err) {
    // Manage Errors
    console.error(`Failed to reconnect to MariaDB database: ${err}`);
    setTimeout(handleDisconnect, 5000);
  }
};

// Initial connection for the first time
handleDisconnect();

// Include all classes from the /classes folder
const classPath = path.join(__dirname, 'classes');
const classFiles = fs.readdirSync(classPath);
const classes = {};
for (const file of classFiles) {
  const className = file.split('.')[0];
  classes[className] = require(path.join(classPath, file));
}

app.get('/:class/:method/:param', async (req, res) => {
  const className = req.params.class;
  const methodName = req.params.method;
  const param = req.params.param;

  // Check if the class and method exist
  if (typeof classes[className] !== 'function') {
    res.send(404, `Class '${className}' not found`);
    return;
  }

  if (typeof classes[className][methodName] !== 'function') {
    res.send(404, `Method '${methodName}' not found`);
    return;
  }

  // Call the method with the given parameter and the database connection
  const result = await classes[className][methodName](pool, param);

  res.send(result);
});

app.post('/:class/:method', async (req, res) => {
  const className = req.params.class;
  const methodName = req.params.method;
  const payload = req.body;

  // Check if the class and method exist
  if (typeof classes[className] !== 'function') {
    console.log(`Class '${className}' not found`);
    res.send(404, `Class '${className}' not found`);
    return;
  }

  if (typeof classes[className][methodName] !== 'function') {
    console.log(`Method '${methodName}' not found`);
    res.send(404, `Method '${methodName}' not found`);
    return;
  }

  // Call the method with the given payload and the database connection
  const result = await classes[className][methodName](pool, payload);

  res.send(result);
});

io.on('connection', (socket) => {
  socket.on('request', async ({ className, methodName, payload }) => {
    // Check if the class and method exist
    if (typeof classes[className] !== 'function') {
      socket.emit('response', { error: `Class '${className}' not found` });
      return;
    }

    if (typeof classes[className][methodName] !== 'function') {
      socket.emit('response', { error: `Method '${methodName}' not found` });
      return;
    }

    // Call the method with the given payload and the database connection
    const result = await classes[className][methodName](pool, payload);

    socket.emit('response', { result });
  });
});

app.start(serverPort);
console.log(`Server started on port ${serverPort}`);