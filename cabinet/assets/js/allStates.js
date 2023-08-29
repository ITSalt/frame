_CTL = stateManager.addState("catalogList", "/cabinet/catalogList/:idParentCatGroup", true);

_CTL.beforeRender = async (data_in) => {
  data_in.parentTemplate = {
    element: "main",
    name: "tmpl_main"
  };
  data_in.element = "mainContent";

  data_in.renderData.catalogList = await clFrontCatGroupList.load(data_in.renderData.exp.idParentCatGroup);
  data_in.renderData.catalogList.push(new clFrontCatGroup("new", {id: "new", name: "Новая группа", description: "", image: "", idParent: data_in.renderData.exp.idParentCatGroup || null }));
  data_in.renderData.parentGroup = new clFrontCatGroup(data_in.renderData.exp.idParentCatGroup);
  await data_in.renderData.parentGroup.load();
  await data_in.renderData.parentGroup.loadParentList();

  console.log(data_in.renderData.parentGroup);

  return data_in;
}

_CTL.events.btnSaveGroup = async (e) => {
  const idGroup = e.target.dataset["id"];

  if (_CTL.validator[idGroup].form()) {
    const group = await clFrontCatGroupList.getGroupById(idGroup);
    if (!group) {
      console.error("Group not found");
      return false;
    }

    group.fullData.name = $$(`[name=catGroupName${idGroup}]`).value;
    group.fullData.description = $$(`[name=catGroupDesc${idGroup}]`).value;
    
    
    const res = await group.save();
    if (res.errorCode) {
      console.error(res);
    }
    else {
      stateManager.changeStateByRoute();
      showNotify("Группа сохранена");
    }
  }
}

_CTL.events.btnDeleteGroup = async (e) => {
  const idGroup = e.target.dataset["id"];
  const group = await clFrontCatGroupList.getGroupById(idGroup);
  if (!group) {
    console.error("Group not found");
    return false;
  }

  group.fullData.isDeleted = "YES";
  const res = await group.save();
  if (res.errorCode) {
    console.error(res);
  }
  else {
    stateManager.changeStateByRoute();
    showNotify("Группа удалена");

  }
}


_CTL.events.imageLoader = async (e) => {
  const idGroup = e.target.dataset["id"];
  const group = await clFrontCatGroupList.getGroupById(idGroup);
  if (!group) {
    console.error("Group not found");
    return false;
  }
  imageLoader(`[name=catGroupImage${idGroup}]`, `#catGroupImageFile${idGroup}`, (data) => { group.fullData.newImage = data; });
}

_CTL.afterRender = async (data_in) => {

  $$("#catBread").innerHTML = $.render["tmpl_catalogBread"](data_in.parentGroup);
  _CTL.validator = {};
  for(let i = 0; i < data_in.catalogList.length; i++) {
    const idGroup = data_in.catalogList[i].id;
    const messages = {};
    messages[`catGroupImageFile${idGroup}`] = { required: "Без картинки грустно" };
    messages[`catGroupName${idGroup}`] = { required: "Без название никак" };
    messages[`catGroupDesc${idGroup}`] = { required: "Без описания грустно" };

    _CTL.validator[idGroup] = $(`#fmEditGroup${idGroup}`).validate(
      {
        messages : messages
      }
    );

    $$(`#catGroupImageFile${idGroup}`).addEventListener('change', _CTL.events.imageLoader, false);
  }
}
_EIT = stateManager.addState("editItem", "/cabinet/catalogList/:idParentCatGroup/editItem/:idItem", true);

_EIT.beforeRender = async (data_in) => {
  data_in.parentTemplate = {
    element: "main",
    name: "tmpl_main"
  };
  data_in.element = "mainContent";

  data_in.renderData.exp.idItem = data_in.renderData.exp.idItem || "new";

  _EIT.item = new clFrontCatItem(data_in.renderData.exp.idItem);
  _EIT.item.fullData.idGroup = data_in.renderData.exp.idParentCatGroup;
  if (data_in.renderData.exp.idItem != "new")
    await _EIT.item.load();
  
  data_in.renderData.item = _EIT.item;
   
  console.log(data_in.renderData.item);

  return data_in;
}

_EIT.afterRender = async (data_in) => {
  $$("#catItemImageFile").addEventListener('change', _EIT.events.imageLoader, false);
  _EIT.validator = $('#fmEditItem').validate(
    {
      messages: {
        catItemName: { required: "Без имени никак" }
      }
    }
  );
}

_EIT.events.imageLoader = async (e) => {
  imageLoader("#catItemImage", "#catItemImageFile", (data) => { _EIT.item.fullData.newImage = data; });
}

_EIT.events.btnSaveItem = async (e) => {
  if (_EIT.validator.form()) {
    _EIT.item.fullData.name = $$("[name=catItemName]").value;
    _EIT.item.fullData.description = $$("[name=catItemDesc]").value;
    _EIT.item.fullData.slangTags = $$("[name=catItemSlang]").value;
    await _EIT.item.save();
    const parentItem = new clFrontCatGroup(_EIT.item.fullData.idGroup);
    await parentItem.load();
    stateManager.changeStateByState("catalogList", parentItem.fullData.idParent ? { exp : {idParentCatGroup: parentItem.fullData.idParent} } : {});
    showNotify("Товар сохранен");
  }
}
_L = stateManager.addState("login", "/cabinet/login", false);

_L.events.btnSignIn = async (event) => {
  event.preventDefault();

  if (_L.validator.form()) {
    const email = $$("#login").value;
    const passwd = md5($$("#password").value);

    const res = await asyncAPI("clUser/authorize", { email, passwd });
    if (res.user) {
      localStorage.setItem("user", JSON.stringify(res.user));
      myUser.restoreFromStorage();
      switch(myUser.fullData.role) {
        case "ROOT":
          stateManager.changeStateByState("main");
          break;
        case "SELLER":
          stateManager.changeStateByState("sellerCat");
          break;
        case "BUYER":
          //stateManager.changeStateByState(_BUYER);
          break;
        default:
          stateManager.changeStateByState("login");
          break;  
      }
    }
    else if (res.errorCode) {
      _L.validator.showErrors({
        "username": "Неверный логин или пароль"
      });
    }
  }
  
}

_L.afterRender = async (data_in) => {
  _L.validator = $('#form-login').validate(
    {
      messages: {
        username: { required: "Пустоте сюда нельзя" },
        password: { required: "Без пароля никак" }
      }
    }
  );
  return data_in;
}
_MAIN = stateManager.addState("main", "/cabinet/main", true);

_MAIN.afterRender = async (data_in) => {
  
  $("body").removeClass("horizontal-menu horizontal-app-menu");

  return data_in;
}
_SCAT = stateManager.addState("sellerCat", "/cabinet/sellercatalog", true);

_SCAT.beforeRender = async (data_in) => {
  /*data_in.parentTemplate = {
    element: "main",
    name: "tmpl_main"
  };
  data_in.element = "mainContent";*/

  const wh = await clFrontWarehouse.load();
  data_in.renderData.warehouse = wh.byId;
  data_in.renderData.catalogList = await clFrontCatGroupList.load(data_in.renderData.exp.idParentCatGroup);

  _SCAT.openOrder = new clFrontOrder();
  await _SCAT.openOrder.load(true);

  return data_in;
 
};

_SCAT.afterRender = async (data_in) => {
  $("body").addClass("horizontal-menu horizontal-app-menu");
  $$('#orderListBody').innerHTML = $.render['tmpl_sellerBasket']({ order: _SCAT.openOrder.fullData });
  $('#mainContent').after($.render['tmpl_swhModalForDel']());
  $$('#badgeBasketCount').innerHTML = _SCAT.openOrder.fullData.positions.length;
  return data_in;
}

_SCAT.events.btnSaveWH = async (e) => {
  const idItem = e.target.dataset.id;
  const plusQuantity = $$(`[name=quant${idItem}]`).value;
  const myWh = new clWHItem(null, { idItem, plusQuantity });
  await myWh.save();
  await myWh.loadByItem(idItem);
  if ($$(`#quant${idItem}`))
    $$(`#quant${idItem}`).innerHTML = `${myWh.fullData.quantity}&nbsp;${myWh.fullData.measureUnit}`;
  else
    $(`#btnPlus${idItem}`).after($.render["tmpl_swhQuantLabel"]({ quantity: myWh.fullData.quantity, id : idItem, measureUnit: myWh.fullData.measureUnit }));
    
  showNotify("Товар успешно добавлен!");
}

_SCAT.events.btnMinus = async (e) => {
  const idItem = e.target.dataset.id;
  const currentQuantity = Number($$(`[name=quant${idItem}]`).value).toFixed(2);
  $$(`[name=quant${idItem}]`).value = currentQuantity - 1;
  if (currentQuantity == 1) {
    e.target.disabled = true;
  }
}

_SCAT.events.btnPlus = async (e) => {
  const idItem = e.target.dataset.id;
  const currentQuantity = Number($$(`[name=quant${idItem}]`).value).toFixed(2);
  $$(`[name=quant${idItem}]`).value = Number(currentQuantity) + 1;
  $$(`#btnMinus${idItem}`).disabled = false;
}

_SWH = stateManager.addState("sellerWH", "/cabinet/sellerwarehouse", true);

_SWH.beforeRender = async (data_in) => {
  data_in.parentTemplate = {
    element: "main",
    name: "tmpl_sellerCat"
  };
  data_in.element = "mainContent";
 
  const wh = await clFrontWarehouse.load();
  data_in.renderData.warehouse = wh.byId;
  data_in.renderData.catalogList = await clFrontCatGroupList.loadOnlyWH(data_in.renderData.exp.idParentCatGroup);
  _SWH.openOrder = new clFrontOrder();
  await _SWH.openOrder.load(true);

  return data_in;

};

_SWH.afterRender = async (data_in) => {
  $$('#orderListBody').innerHTML = $.render['tmpl_sellerBasket']({ order: _SWH.openOrder.fullData });
  $('#mainContent').after($.render['tmpl_swhModalForDel']());
  $$('#badgeBasketCount').innerHTML = _SWH.openOrder.fullData.positions.length;
  return data_in;
}

_SWH.events.btnAddToOrder = async (e) => {
  const idItem = e.target.dataset.id;
  const orderQuantity = Number($$(`[name=quant${idItem}]`).value).toFixed(2);
  const whItem = clFrontWarehouse.getWHbyItemId(idItem);
  if (whItem.quantity < orderQuantity) {
    showNotify("На складе недостаточно товара!");
    return;
  }
  let orderPosition = _SWH.openOrder.fullData.positions.find(pos => pos.idItem == idItem);
  if (orderPosition) {
    orderPosition.orderQuantity = orderQuantity;
  }
  else {
    orderPosition = new clFrontOrderPosition("new", { idWH: whItem.id, orderQuantity, idOrder: _SWH.openOrder.id });
    _SWH.openOrder.fullData.positions.push(orderPosition);
  }
  await orderPosition.save();
  await _SWH.openOrder.load(true);
  $$('#orderListBody').innerHTML = $.render['tmpl_sellerBasket']({ order: _SWH.openOrder.fullData });
  $$('#badgeBasketCount').innerHTML = _SWH.openOrder.fullData.positions.length;
  $$('[name=btnSendOrder]').onclick = _SWH.events.btnSendOrder;
  showNotify("Товар успешно добавлен!");
}

_SWH.events.btnOneClickSend = async (e) => {
  showNotify("Заработает чуть позже", "top-right", "danger", "Немного терпения");
}

_SWH.events.btnDelOrderPos = async (e) => {
  _SWH.idPosForDel = e.currentTarget.dataset.id;
  $('#modalConfirmDelOrderPos').modal('show');
}

_SWH.events.btnDelOrderPosConfirmed = async (e) => {
  const orderPosition = _SWH.openOrder.fullData.positions.find(pos => pos.id == _SWH.idPosForDel);
  await orderPosition.delete();
  await _SWH.openOrder.load(true);
  $$('#orderListBody').innerHTML = $.render['tmpl_sellerBasket']({ order: _SWH.openOrder.fullData });
  $$('#badgeBasketCount').innerHTML = _SWH.openOrder.fullData.positions.length;
  if (_SWH.openOrder.fullData.positions.length) {
    $$('[name=btnSendOrder]').onclick = _SWH.events.btnSendOrder;
  }
  showNotify("Товар успешно удален!", "top-left");
}

_SWH.events.btnSendOrder = async (e) => {

  if (_SWH.openOrder.fullData.positions.length == 0) {
    showNotify("Ваша корзина пуста!", "top-left", "danger");
    return;
  }

  const res = await _SWH.openOrder.sendOrder();
  await _SWH.openOrder.load(true);
  $$('#orderListBody').innerHTML = $.render['tmpl_sellerBasket']({ order: _SWH.openOrder.fullData });
  $$('#badgeBasketCount').innerHTML = _SWH.openOrder.fullData.positions.length;
  if (_SWH.openOrder.fullData.positions.length) {
    $$('[name=btnSendOrder]').onclick = _SWH.events.btnSendOrder;
  }
  if (res) {
    stateManager.changeStateByState("sellerWH");
    showNotify("Заказ успешно отправлен!", "top-left", "success");
  } 
  
}

_SWH.events.btnMinus = async (e) => {
  const idItem = e.target.dataset.id;
  const currentQuantity = Number($$(`[name=quant${idItem}]`).value).toFixed(2);
  $$(`[name=quant${idItem}]`).value = currentQuantity - 1;
  if (currentQuantity == 1) {
    e.target.disabled = true;
  }
  $$(`#btnPlus${idItem}`).disabled = false;
}

_SWH.events.btnPlus = async (e) => {
  const idItem = e.target.dataset.id;
  const whItem = clFrontWarehouse.getWHbyItemId(idItem);
  const currentQuantity = Number($$(`[name=quant${idItem}]`).value).toFixed(2);
  $$(`[name=quant${idItem}]`).value = Number(currentQuantity) + 1;
  $$(`#btnMinus${idItem}`).disabled = false;
  if (parseFloat(whItem.quantity) == parseFloat(currentQuantity) + 1) {
    e.target.disabled = true;
  }
}
_UE = stateManager.addState("userEdit", "/cabinet/userEdit/:idUser", true);

_UE.beforeRender = async (data_in) => {
  data_in.parentTemplate = {
    element: "main",
    name: "tmpl_main"
  };
  data_in.element = "mainContent";
  _UE.currentUser = new clFrontUser(data_in.renderData.exp.idUser);
  await _UE.currentUser.load();
  data_in.renderData.user = _UE.currentUser.fullData;

  return data_in;
}

_UE.events.avatarLoader = async (e) => {
  imageLoader("#avatarPreview", "#avatarLoader", (data) => { _UE.currentUser.fullData.avatarData = data; });
}

_UE.events.btnSaveUser = async (e) => {
  if (_UE.validator.form()) {
    _UE.currentUser.fullData.fName = $$("[name=fName]").value;
    _UE.currentUser.fullData.lName = $$("[name=lName]").value;
    _UE.currentUser.fullData.mName = $$("[name=mName]").value;
    _UE.currentUser.fullData.email = $$("[name=email]").value;
    _UE.currentUser.fullData.phone = $$("[name=phone]").value;
    _UE.currentUser.fullData.passwd = md5($$("[name=passwd]").value);

    const res = await _UE.currentUser.save();
    console.log(res);
  }
}

_UE.afterRender = async (data_in) => {
  $$("#avatarLoader").addEventListener('change', _UE.events.avatarLoader, false);
  _UE.validator = $('#fmUserEdit').validate(
    {
      messages: {
        fName: { required: "Без имени никак" },
        lName: { required: "Без фамилии никак" },
        email: { required: "Без почты никак" },
        passwd: { required: "Без пароля никак" },
        passwdRepeat: { equalTo: "Пароли не совпадают" }
      },
      rules: {
        passwdRepeat: {
          equalTo: "#passwd"
        }
      }
    }
  );

  return data_in;
}
//popupTemplates.push("editUserPopup");

_USL = stateManager.addState("userList", "/cabinet/userList", true);

_USL.beforeRender = async (data_in) => {
  
  data_in.parentTemplate = {
    element: "main",
    name: "tmpl_main"
  };
  data_in.element = "mainContent";
  data_in.renderData.userList = await clFrontUserList.getUserList();

  return data_in;
}

/*_USL.events.btnUserEdit = async (e) => {
  const id = $$("#btnUserEdit").dataset["id"];
  _USL.currentUser = await clFrontUserList.getUser(id);
  $('#editUserPopup').replaceWith($.render["tmpl_editUserPopup"](_USL.currentUser.fullData));
  $$("#avatarLoader").addEventListener('change', _USL.events.avatarLoader, false);
  $('#editUserPopup').modal('show');
}*/

_USL.afterRender = async (data_in) => {
  $("#tblUserList").DataTable({
    "sDom": "<t><'row'<p i>>",
    "destroy": true,
    "scrollCollapse": true,
    data: data_in.userList,
    columns: [
      { data: "fullData.fName" },
      { data: "fullData.lName" },
      { data: "fullData.mName" },
      { data: "fullData.email" },
      { data: "fullData.phone" },
      {
        data: "fullData.created", render: function (data, type, row) {
          return moment(data).format('DD.MM.YY HH:mm:ss');
        }
      },
      {
        data: "", render: function (data, type, row) {
          return $.render["tmpl_userListActions"]({ id: row.fullData.id });
        }
      }
    ]
  });

  

  return data_in;
}

_USL.events.btnUserSave = async (e) => {
  
  if (_USL.validator.form()) {
    const res = await _USL.currentUser.save();
    if (res) {
      $('#editUserPopup').modal('hide');
      stateManager.changeStateByState(_USL);
    }
  }
}
_WH = stateManager.addState("warehouse", "/cabinet/warehouse", true);

_WH.beforeRender = async (data_in) => {
  data_in.parentTemplate = {
    element: "main",
    name: "tmpl_main"
  };
  data_in.element = "mainContent";

  data_in.renderData.warehouse = await clFrontWarehouse.load();

  return data_in;

};