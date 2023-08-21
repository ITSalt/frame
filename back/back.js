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
const tokenName = process.env.TOKEN_NAME || 'frameToken';

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

// Include all classes from the /classes folder and subfolders
function loadClasses(classPath) {
  const files = fs.readdirSync(classPath);

  const classes = {};

  for (const file of files) {
    const filePath = path.join(classPath, file);
    const isDirectory = fs.statSync(filePath).isDirectory();

    if (isDirectory) {
      Object.assign(classes, loadClasses(filePath));
    } else if (file.endsWith('.js')) {
      const className = path.parse(file).name;
      classes[className] = require(filePath);
    }
  }

  return classes;
}

const classPath = path.join(__dirname, 'classes');
const classes = loadClasses(classPath);

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
  // get cookies and parse them
  const cookies = req.headers.cookie;
  const cookiesParsed = {};
  if (cookies) {
    cookies.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      cookiesParsed[parts[0].trim()] = (parts[1] || '').trim();
    });
  }
  payload.cookies = cookiesParsed;
  if(payload.cookies[tokenName])
    payload.token = payload.cookies[tokenName];

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
  if (result.freshToken) {
    res.setHeader('Set-Cookie', `${tokenName}=${result.freshToken}; HttpOnly; path=/`);
    delete result.freshToken;
  }
  if (result.errorCode && result.errorCode === "INVALID_TOKEN") {
    res.setHeader('Set-Cookie', `${tokenName}=; HttpOnly; max-age=0; path=/`);
  }

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