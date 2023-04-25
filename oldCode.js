'use strict';

const { Server } = require("socket.io");

const io = new Server({
  cors: {
    origin: "*"
  }
});


var mysql = require('mysql');

const Mercury = require('./soapWorker');
const settings = require('./config');
const MySQL = require('./dbWorker');
const db = new MySQL();
const Food = require('./cl_Foods');
const Dish = require('./cl_Dish');
const AutoStamp = require('./cl_AutoStamp');


var ftp_to_1C = {
  host: "83.171.123.68",
  port: 21, // defaults to 21
  user: "gizomenu", // defaults to "anonymous"
  password: "bjgizomenu14" // defaults to "@anonymous"
};

var connection = null;

var fs = require('fs');
//var JSFtp = require("ftp");
var ftpClient = require("ftp");
//var iconv = require('/usr/src/node-v0.10.26/node_modules/iconv-lite');

var my_state = {
  'clients': {},
  'guestpanels': {},
  'orders': {},
  'p_get_order_data': function (DeviceKey) {
    if (!this.clients[DeviceKey])
      return null;

    var id_order = this.clients[DeviceKey].id_order;
    for (var i in this.orders["id" + id_order]) {
      if (this.orders["id" + id_order][i].DeviceKey == DeviceKey) {
        return this.orders["id" + id_order][i];
        break;
      }
    }

    return null;
  },
  'connect_client': function (DeviceKey, id_socket, id_order, id_cashbox) {
    this.clients[DeviceKey] = { 'id_socket': id_socket, 'id_order': id_order, 'id_cashbox': id_cashbox };

    console.log('Connect device %s cashbox %s', DeviceKey, id_cashbox)
    var other_device = 0;

    if (!(id_order in this.orders))
      this.orders["id" + id_order] = [];
    else {
      // Отправляем всем остальным устройствам за столиком уведомление о новом планшете
      for (var i in this.orders["id" + id_order]) {
        io.to(this.orders["id" + id_order][i].id_socket).emit('change_device_count', { 'change_count': "+1", 'mode': 'change' });
        other_device++;
      }
    }
    //Если для клиента была гостевая панель - уведомляем панель о подключении
    if (id_cashbox in this.guestpanels) {
      for (var i in this.guestpanels[id_cashbox])
        io.to(this.guestpanels[id_cashbox][i].id_socket).emit('change_device_count', { 'change_count': "+1", 'mode': 'change', 'id_cashbox': id_cashbox });

      console.log("Send notice for panel %s", id_cashbox);
    }

    // И самому себе - с учетом себя самого
    io.to(id_socket).emit('change_device_count', { 'change_count': (parseInt(other_device) + 1), 'mode': 'set' });
    console.log("Send self notice " + (parseInt(other_device) + 1));

    this.orders["id" + id_order].push({ 'id_socket': id_socket, 'DeviceKey': DeviceKey, 'dishes': {} });

    return true;
  },
  'connect_guestpanel': function (DeviceKey, id_socket, id_cashbox) {
    this.guestpanels[id_cashbox] = this.guestpanels[id_cashbox] || [];
    this.guestpanels[id_cashbox].push({ 'id_socket': id_socket, 'DeviceKey': DeviceKey });

    console.log('Guestpanel %s connected to cashbox %s', DeviceKey, id_cashbox);

    //Проверяем, открыт ли заказ на кассе, к которой присоединили панель
    for (var i in this.clients) {
      if ((this.clients[i].id_cashbox == id_cashbox) && this.p_get_order_data(i)) {
        // Уведомляем панель о наличии клиента
        io.to(id_socket).emit('change_device_count', { 'change_count': "+1", 'mode': 'change', 'id_cashbox': id_cashbox });
        // Отправляем все блюда из заказа на панель
        var dishes = this.p_get_order_data(i).dishes;
        //io.to(id_socket).emit('new_dish_in_order', {'id_dish' : j, 'dish' :this.orders[this.clients[i].id_order]});
        for (var j in dishes) {
          io.to(id_socket).emit('new_dish_in_order', { 'id_dish': j, 'dish': dishes[j] });
        }
      }
    }

    return true;
  },
  'connect_unknown': function (DeviceKey, id_socket, id_order, id_cashbox) {
    console.log("unknown connect");
    this.clients[DeviceKey] = { 'id_socket': id_socket, 'id_order': id_order, 'id_cashbox': id_cashbox };

    return true;
  },
  'precise_definition': function (data) {
    switch (data.mode) {
      case 'client':
        my_state.connect_client(data.DeviceKey, this.clients[data.DeviceKey].id_socket, data.id_order, data.id_cashbox);
        break;

      case 'panel':
        my_state.connect_guestpanel(data.DeviceKey, this.clients[data.DeviceKey].id_socket, data.id_cashbox);
        break;
    }

    return true;
  },
  'show_dish': function (id_dish, DeviceKey) {
    var id_order = this.clients[DeviceKey].id_order;
    for (var i in this.orders["id" + id_order]) {
      if (this.orders["id" + id_order][i].DeviceKey != DeviceKey)
        io.to(this.orders["id" + id_order][i].id_socket).emit('need_show_dish', { 'id_dish': id_dish });
    }

    return true;
  },
  'add_dish': function (id_dish, DeviceKey, dish_count, dish_data) {
    var order_data = this.p_get_order_data(DeviceKey) || {};
    if ("dishes" in order_data) {
      if (id_dish in order_data.dishes)
        order_data.dishes[id_dish].count += parseInt(dish_count);
      else {
        order_data.dishes[id_dish] = {
          'dish_data': {},
          'count': parseInt(dish_count)
        }
        for (var i in dish_data)
          order_data.dishes[id_dish].dish_data[i] = dish_data[i];
      }

      // Отправляем уведомление гостевым панелям, если работаем через кассу
      var id_cashbox = this.clients[DeviceKey].id_cashbox;
      if (id_cashbox in this.guestpanels)
        for (var i in this.guestpanels[id_cashbox]) {
          io.to(this.guestpanels[id_cashbox][i].id_socket).emit('new_dish_in_order', { 'id_dish': id_dish, 'dish': order_data.dishes[id_dish] });
        }
    }
    else
      console.log("No dishes: " + order_data);
  },
  'remove_dish': function (id_dish, DeviceKey) {
    var order_data = this.p_get_order_data(DeviceKey) || {};
    if ('dishes' in order_data) {
      order_data.dishes[id_dish].count -= 1;

      // Отправляем уведомление гостевым панелям, если работаем через кассу
      var id_cashbox = this.clients[DeviceKey].id_cashbox;
      if (id_cashbox in this.guestpanels)
        for (var i in this.guestpanels[id_cashbox]) {
          io.to(this.guestpanels[id_cashbox][i].id_socket).emit('new_dish_in_order', { 'id_dish': id_dish, 'dish': order_data.dishes[id_dish] });
        }

      if (!order_data.dishes[id_dish].count)
        delete order_data.dishes[id_dish];
    }

  },
  'disconnected_client': function (DeviceKey, id_order, id_cashbox, onlyForPanel) {
    onlyForPanel = onlyForPanel || false;
    //Если для клиента была гостевая панель - уведомляем панель об отключении
    if (id_cashbox in this.guestpanels)
      for (var i in this.guestpanels[id_cashbox])
        io.to(this.guestpanels[id_cashbox][i].id_socket).emit('change_device_count', { 'change_count': "-1", 'mode': 'change', 'id_cashbox': id_cashbox });

    if (!onlyForPanel)
      delete this.clients[DeviceKey];

    for (var i in this.orders["id" + id_order])
      if (this.orders["id" + id_order][i].DeviceKey == DeviceKey) {
        delete this.orders["id" + id_order][i];
      }
      else {
        // Отправляем всем остальным устройствам за столиком уведомление об уменьшении планшетов
        io.to(this.orders["id" + id_order][i].id_socket).emit('change_device_count', { 'change_count': "-1", 'mode': 'change', 'id_cashbox': id_cashbox });
      }

    if (!connection)
      connection = mysql.createConnection(settings.dbAuth);

    connection.query('UPDATE rest_OrderDevices od SET od.DeviceState = "DISCONNECTED" WHERE od.DeviceKey = ? AND od.DeviceState = "BEFORE_ORDER" and od.id_order = ?', [DeviceKey, parseInt(id_order)], function (err, results) {
      if (err)
        console.log(err);

      //connection.end();
    });

    return true;

  },
  'disconnect_guestpanel': function (DeviceKey, id_cashbox) {

    for (var i in this.guestpanels[id_cashbox])
      if (this.guestpanels[id_cashbox][i].DeviceKey == DeviceKey) {
        delete this.guestpanels[id_cashbox][i];
        break;
      }

    return true;

  }
};

io.on('connection', function (socket) {
  var hs = socket.handshake;
  console.log('Connected %s ', hs.query.DeviceKey);

  hs.query.mode = hs.query.mode || "unknown"; // or panel
  hs.query.id_cashbox = hs.query.id_cashbox || 0;
  hs.query.id_order = hs.query.id_order || 0;
  switch (hs.query.mode) {
    case 'client':
      my_state.connect_client(hs.query.DeviceKey, socket.id, hs.query.id_order, hs.query.id_cashbox);
      break;

    case 'panel':
      my_state.connect_guestpanel(hs.query.DeviceKey, socket.id, hs.query.id_cashbox);
      break;

    default:
      my_state.connect_unknown(hs.query.DeviceKey, socket.id, hs.query.id_order, hs.query.id_cashbox);
      break;
  }

  socket.on('precise_definition', function (data) {
    console.log('Precise definition' + data.DeviceKey);
    my_state.precise_definition(data);
  });

  socket.on('show_dish', function (data) {
    console.log('Query form ' + data.DeviceKey);
    my_state.show_dish(data.id_dish, data.DeviceKey);

  });

  socket.on('add_dish', function (data) {
    console.log('Add dish %s form %s', data.id_dish, data.DeviceKey);

    my_state.add_dish(data.id_dish, data.DeviceKey, data.dish_count, data.dish_data);

  });

  socket.on('remove_dish', function (data) {
    console.log('Remove dish %s form %s', data.id_dish, data.DeviceKey);

    my_state.remove_dish(data.id_dish, data.DeviceKey);

  });

  socket.on('disconnect', function () {
    var hs = socket.handshake;

    hs.query.mode = hs.query.mode || "unknown"; // or panel
    hs.query.id_cashbox = hs.query.id_cashbox || 0;
    console.log('Disconnected %s cashbox %s', hs.query.DeviceKey, hs.query.id_cashbox);
    switch (hs.query.mode) {
      case 'client':
        my_state.disconnected_client(hs.query.DeviceKey, hs.query.id_order, hs.query.id_cashbox);
        break;

      case 'panel':
        my_state.disconnect_guestpanel(hs.query.DeviceKey, hs.query.id_cashbox);
        break;

      case 'unknown':
        if (hs.query.DeviceKey in my_state.clients) {
          my_state.disconnected_client(hs.query.DeviceKey, my_state.clients[hs.query.DeviceKey].id_order, my_state.clients[hs.query.DeviceKey].id_cashbox);
        }
        else {
          for (var id_cashbox in my_state.guestpanels) {
            for (var i in my_state.guestpanels[id_cashbox]) {
              if (my_state.guestpanels[id_cashbox][i].DeviceKey == hs.query.DeviceKey) {
                my_state.disconnect_guestpanel(hs.query.DeviceKey, id_cashbox);
                break;
              }

            }
          }
        }
    }

  });

  socket.on('client_disconnect', function () {
    var hs = socket.handshake;

    if (hs.query.DeviceKey in my_state.clients) {
      my_state.disconnected_client(hs.query.DeviceKey, my_state.clients[hs.query.DeviceKey].id_order, my_state.clients[hs.query.DeviceKey].id_cashbox, true);
    }

    console.log('Disconnected %s cashbox %s', hs.query.DeviceKey, hs.query.id_cashbox);

  });

  socket.on('send_push', function (data) {
    console.log("Request on push for id_table %s, TableName %s", data.id_Table, data.TableName);

    if (!connection)
      connection = mysql.createConnection(settings.dbAuth);

    if (data.event_type) {
      connection.query('INSERT INTO rest_GarconMessages (MessageType, Descr, id_Table) VALUES (?, ?, ?)', [data.event_type, data.event_type, data.id_Table], function (err, results) {
        if (err)
          console.log(err);
        else
          console.log("Good save GarconMessage");
      });
    }
  });

  socket.on('close_order', function (data) {
    // Оповещает о необходимости отклчиться от id_Order
    console.log('Close order %s', data.id_Order);
    io.sockets.emit("close_order", { "id_Order": data.id_Order });
  });


  socket.on('act_PrintRecipe', function (data) {
    // Оповещает о необходимости напечатать пречек
    console.log('Print order %s', data.id_Order);
    io.sockets.emit("act_PrintRecipe", { "id_Order": data.id_Order, "mode": data.mode, 'id_Table': data.id_Table });
  });

  socket.on('get_1C_files_old', function (data) {
    ftp = new JSFtp(ftp_to_1C);

    //console.log(ftp.raw);
    ftp.raw.pasv("", function (err, data) {
      if (err) {
        console.log(err);
        return console.error(err);
      }

      console.log(data);

      ftp.get("*.*", '../_files1c/IN/', function (hadErr) {
        if (hadErr) {
          console.error(hadErr);
          //console.error('There was an error retrieving the file.');
        }
        else
          console.log('File copied successfully!');
      });

    });
  });

  socket.on('get_1C_files', function (data) {
    iconv.extendNodeEncodings();

    var c = new JSFtp();
    c.on('ready', function () {
      c.ascii(function (err) {
        if (err) console.error(err);

        c.listSafe(function (err, list) {
          if (err) throw err;

          c.get("asd.txt", function (err, stream) {
            if (err)
              console.error(err);
            else
              //stream.once('close', function() { c.end(); });
              stream.pipe(fs.createWriteStream('../_files1c/IN/'));
          });

        });
      });


    });
    // connect to localhost:21 as anonymous
    c.connect(ftp_to_1C);
  });

  socket.on('upload1c', function () {
    console.log("Start FTP upload...");
    var myFTP = new ftpClient();
    myFTP.on('ready', function () {
      console.log("Ready FTP upload...");
      fs.readdir(settings.pathTo1C, function (err, items) {
        //  console.log(items);

        for (var i = 0; i < items.length; i++) {
          (function (data) {
            myFTP.put(`${settings.pathTo1C}${items[i]}`, `${items[i]}`, (err) => {
              if (err) {
                console.log("FTP Error:");
                console.log(err);
                myFTP.end();
              }
              else {
                fs.unlink(`${settings.pathTo1C}${data}`, (err) => {
                  if (err) console.log(err);
                });
              }
            })
          }(items[i]));
        }

        console.log("End of FTP uploads");
        myFTP.end();
      });

    });
    myFTP.connect(ftp_to_1C);
  });

  socket.on('close_1C_ftp', function (data) {
    ftp.raw.quit(function (err, data) {
      if (err) return console.error(err);

      console.log("Bye!");
    });
  });

  socket.on('MercExchange', async (data, cb) => {
    // получает данные из Меркурия
    const sender = (sendData) => {
      const mySocket = io.sockets;
      const myListener = data.listener || "";
      const myCb = cb || "";

      if (sendData.isFinal) {
        // Выбираем канал отправки
        if (myCb)
          myCb(sendData);
        else
          mySocket.emit(myListener, sendData);
      }
      else {
        mySocket.emit(myListener, sendData);
      }
    }

    sender({ msg: 'Старт...' });
    console.log('MercExchange section %s', data.section);
    let merc = new Mercury(io.sockets, data.listener || "", sender);
    try {
      let retData = await merc.MercExchange(data.data, data.section);
      sender({ result: retData, msg: "Готово!", isFinal: true });
      console.log("Section %s result good", data.section);

    } catch (error) {
      console.log(error);
      let msg = (error.statusCode && error.statusMessage) ? `Ошибка ${result.statusCode} ${result.statusMessage}` : "Меркурий не отвечает";

      sender({ errResult: error, msg: msg, isFinal: true });
      console.log("Section %s result BAD!!!", data.section);
    }


  });

  socket.on('GetMercuryRecipeById', async (data) => {
    // получает данные о свидетельстве по uuid
    const myListener = data.listener;
    io.sockets.emit(myListener, { msg: 'Старт...' });
    console.log('GetMercuryRecipeById %s', data.uuid);
    let merc = new Mercury(io.sockets, myListener);
    try {
      console.log("ddd");
      let retData = await merc.getVetRecipeByUUID2(data.uuid);
      io.sockets.emit(myListener, { result: retData, msg: "Готово!" });
      console.log("GetMercuryRecipeById result good");

    } catch (error) {
      let msg = (error.statusCode && error.statusMessage) ? `Ошибка ${result.statusCode} ${result.statusMessage}` : "Меркурий не отвечает";

      io.sockets.emit(myListener, { result: error, msg: msg });
      console.log("GetMercuryRecipeById result error");
    }


  });

  socket.on('IncomingConsignmen', function (data) {
    // гасит свидетельство
    const myListener = data.listener;
    io.sockets.emit(myListener, { msg: 'Старт...' });
    console.log('IncomingConsignmen %s', data.vet.vetDocument.uuid);
    const cb = (result) => {
      io.sockets.emit(myListener, { result: result, msg: "Готово!" });
      console.log("IncomingConsignmen result");
    }
    let merc = new Mercury(io.sockets, myListener);
    merc.IncomingConsignmen(data.vet.vetDocument, cb);

  });

  socket.on("out", async (data) => {
    // Создаёт исходящую продукцию
    const sender = (sendData) => {
      const mySocket = io.sockets;
      const myListener = data.listener || "";

      mySocket.emit(myListener, sendData);
    }

    let merc = new Mercury(io.sockets, data.listener || "", sender);
    console.log(data);

    let oneDish = new Dish(db, data.id_Dish, merc);
    let myDishTK = await oneDish.makeMercProduction(data.weight, data.id_dio, data.agentGUID, data.vehicleNumber, data.issueSeries, data.issueNumber, data.agentType, data.agentINN, data.transportStorageType, data.daysOfExpiry);

    sender(myDishTK);
  });

  socket.on("cookDish", async (data) => {
    // Списывает продукты по блюду со склада
    const sender = (sendData) => {
      const mySocket = io.sockets;
      const myListener = data.listener || "";

      mySocket.emit(myListener, sendData);
    }

    let oneDish = new Dish(db, data.id_Dish, null, sender);
    let myDishTK = await oneDish.cookDish(data.weight, data.id_dio);

    sender(myDishTK);
  });

  socket.on("getDishTK", async (data) => {
    // Списывает продукты по блюду со склада
    const sender = (sendData) => {
      const mySocket = io.sockets;
      const myListener = data.listener || "";

      mySocket.emit(myListener, sendData);
    }

    let oneDish = new Dish(db, data.id_Dish, null, sender);
    let myDishTK = await oneDish.getDishTK(data.weight, data.id_dio);

    sender(myDishTK);
  });

  socket.on("collationStatement", async (data) => {
    // Формирует сличительную ведомость
    const myListener = data.listener;

    const sender = (sendData) => {
      const mySocket = io.sockets;
      const myListener = data.listener || "";

      mySocket.emit(myListener, sendData);
    }

    let stamp = new AutoStamp(db, new Mercury(io.sockets, myListener), io.sockets, myListener);
    stamp.collationStatement(data, sender);

  });

  socket.on("checkDishOnMerc", async (data) => {
    let result = await db.queryRow("SELECT id FROM rest_Dishes WHERE fullDeleted = 'NO'");
    let dishes = [];
    let mercRes = [];
    let lastIndex = 0;
    for (const oneDish of result) {
      lastIndex = dishes.push(new Dish(db, oneDish.id));
      mercRes.push(dishes[lastIndex - 1].checkMercuryUse())
    }
    const allResult = await Promise.all(mercRes);

    const myListener = data.listener;
    io.sockets.emit(myListener, allResult);
  });


  socket.on("createMercDishes", async (data) => {
    const myListener = data.listener;
    io.sockets.emit(myListener, { msg: 'Старт...' });
    let result = await db.queryRow("SELECT d.id, dl.Name as DishName FROM rest_Dishes d JOIN rest_DishLang dl ON d.id=dl.id_Dish AND dl.id_lang = 1 WHERE d.fullDeleted = 'NO' AND d.useMercuryOut = 'YES' AND d.mercGUID = '' LIMIT 0, 5");
    let dishes = [];
    let mercRes = [];
    let lastIndex = -1;
    for (const oneDish of result) {
      lastIndex = dishes.push(new Dish(db, oneDish.id));
      mercRes.push(dishes[lastIndex - 1].addToMercury(oneDish.DishName))
    }
    const allResult = await Promise.all(mercRes);


    io.sockets.emit(myListener, allResult);
  });

  socket.on("dbQuery", async (data) => {
    let result = await db.queryRow(data.query);

    const myListener = data.listener;
    io.sockets.emit(myListener, [result]);
  });

  socket.on('OutgoingConsigment', function (data) {
    // создает исходящее свидетельство ??? Похоже, не используется
    const myListener = data.listener;
    io.sockets.emit(myListener, { msg: 'Старт...' });
    console.log('OutgoingConsigment');
    const cb = (result) => {
      io.sockets.emit(myListener, { result: result, msg: "Готово!" });
      console.log("OutgoingConsigment result");
    }
    let merc = new Mercury(io.sockets, myListener);
    merc.OutgoingConsigment(data.dishData, cb);

  });

  socket.on('MerkuryCheckResult', function (data) {
    // проверяет статус заявки
    const myListener = data.listener;
    io.sockets.emit(myListener, { msg: 'Старт...' });
    console.log('MerkuryCheckResult');
    const cb = (result) => {
      io.sockets.emit(myListener, { result: result, msg: "Готово!" });
      console.log("MerkuryCheckResult result");
    }
    let merc = new Mercury(io.sockets, myListener);
    merc.CheckResult(data.appID, cb);

  });

  socket.on('AutoStamping', function (data) {
    // запускает автогашение накладных Меркурия
    const myListener = data.listener;
    io.sockets.emit(myListener, { msg: 'Старт...' });
    console.log('AutoStamping');
    const cb = (result) => {
      io.sockets.emit(myListener, { msg: "Готово!" });
      console.log("AutoStamping result");
    }
    let stamp = new AutoStamp(db, new Mercury(io.sockets, myListener), io.sockets, myListener);
    stamp.loadAgents(cb);


  });

  socket.on('SyncStock', function (data) {
    // запускает синхронизацию проводок по складу
    const myListener = data.listener;
    io.sockets.emit(myListener, { msg: 'Старт...' });
    console.log('SyncStock');
    const cb = (result) => {
      io.sockets.emit(myListener, { msg: "Готово!" });
      console.log("SyncStock result");
    }
    let stamp = new AutoStamp(db, new Mercury(io.sockets, myListener), io.sockets, myListener);
    stamp.syncFoodsWithMercury(cb);


  });

  socket.on('AutoRevision', function (data) {
    // запускает сбор данных по проводкам для всех агентов
    const myListener = data.listener;
    io.sockets.emit(myListener, { msg: 'Старт...' });
    console.log('AutoRevision start');
    const cb = (result) => {
      io.sockets.emit(myListener, { msg: "Готово!" });
      console.log("AutoRevision result");
    }
    let stamp = new AutoStamp(db, new Mercury(io.sockets, myListener), io.sockets, myListener);
    switch (parseInt(data.step)) {
      case 1:
        stamp.getDataForAutoRevision(cb, data);
        break;

      case 2:
        stamp.MakeAutoRevision(cb, data);
        break;

      case 3:
        stamp.getMercuryFoodForHandRevision(cb, data);
        break;

      default:
        io.sockets.emit(myListener, { msg: "Неизвестное действие" });
    }


  });


});

io.listen(8080);
