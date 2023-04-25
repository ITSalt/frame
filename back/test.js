// Required Modules
const mariadb = require("mariadb");

//Initialize Pool
const pool = mariadb.createPool({
  socketPath: "/var/run/mysqld/mysqld.sock",
  user: "root",
  password: "z6rJxa2t",
  database: "db_gizosklad",
  connectionLimit: 10,
});

console.log("Total connections: ", pool.totalConnections());
console.log("Active connections: ", pool.activeConnections());
console.log("Idle connections: ", pool.idleConnections());




async function main() {
  let conn;

  try {
    conn = await fetchConn();
  } catch (err) {
    // Manage Errors
    console.log(err);
  } finally {
    // Close Connection
    if (conn) conn.end();
  }
}

main();

/*
let conn;
const cn = async () => {
  try {
    conn = await pool.getConnection();
    console.log('connected ! connection id is ' + conn.threadId);
    conn.release(); //release to pool
  } catch (err) {
    console.log('not connected due to error: ' + err);
  }
}

cn(); */
