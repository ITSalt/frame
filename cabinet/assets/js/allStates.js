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
      stateManager.changeStateByState(_MAIN);
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
_MAIN = stateManager.addState("main", "/cabinet", true);

_MAIN.afterRender = async (data_in) => {
  

  return data_in;
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